package expo.modules.v2ray

import com.hiddify.core.libbox.CommandClient
import com.hiddify.core.libbox.CommandClientHandler
import com.hiddify.core.libbox.CommandClientOptions
import com.hiddify.core.libbox.ConnectionEvents
import com.hiddify.core.libbox.Libbox
import com.hiddify.core.libbox.LogIterator
import com.hiddify.core.libbox.OutboundGroupIterator
import com.hiddify.core.libbox.StatusMessage
import com.hiddify.core.libbox.StringIterator
import com.hiddify.core.mobile.Mobile
import com.hiddify.core.mobile.SetupOptions
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

data class TrafficStats(
  val uploadBytes: Long,
  val downloadBytes: Long,
  val uploadSpeed: Long,
  val downloadSpeed: Long,
)

class HiddifyCoreController(private val vpnService: ExpoV2rayVpnService) {
  private val statsLock = Any()
  @Volatile private var lastStats = TrafficStats(0L, 0L, 0L, 0L)
  private var commandClient: CommandClient? = null

  fun setup(): Result<Unit> {
    return try {
      if (!setupOnce.compareAndSet(false, true)) return Result.success(Unit)

    val basePath = vpnService.filesDir.absolutePath
    val workingDir = File(vpnService.filesDir, "working").apply { mkdirs() }
    val tempDir = vpnService.cacheDir.apply { mkdirs() }
    Mobile.setup(SetupOptions().apply {
      setBasePath(basePath)
      setWorkingDir(workingDir.absolutePath)
      setTempDir(tempDir.absolutePath)
      setDebug(false)
      setFixAndroidStack(false)
    }, PlatformInterfaceImpl(vpnService))
    VpnEventBus.emitLog("info", "Hiddify core setup completed")
    Result.success(Unit)
  } catch (throwable: Throwable) {
    setupOnce.set(false)
    reportError("Mobile.setup failed", throwable)
    Result.failure(throwable)
    }
  }

  fun start(configJson: String): Result<Unit> {
    return try {
      if (!coreRunning.compareAndSet(false, true)) return Result.success(Unit)

    val basePath = vpnService.filesDir.absolutePath
    VpnEventBus.emitState("starting", "VPN core starting")
    Mobile.start(basePath, configJson)

    // Wait for command.sock file to be created by core (max 5s)
    val socketFile = File(basePath, "command.sock")
    val maxWaitMs = 5000L
    val pollIntervalMs = 100L
    val startTime = System.currentTimeMillis()

    while (!socketFile.exists() && System.currentTimeMillis() - startTime < maxWaitMs) {
      Thread.sleep(pollIntervalMs)
    }

    if (!socketFile.exists()) {
      throw IllegalStateException("command.sock was not created within ${maxWaitMs}ms")
    }

    VpnEventBus.emitLog("info", "command.sock ready after ${System.currentTimeMillis() - startTime}ms")

    // Additional small delay to ensure the socket is listening, not just created
    Thread.sleep(200)

    commandClient = CommandClient(createCommandHandler(), CommandClientOptions().apply {
      setStatusInterval(2_000_000_000L)
      addCommand(Libbox.CommandStatus)
      addCommand(Libbox.CommandLog)
    }).also { it.connect() }
    Result.success(Unit)
  } catch (throwable: Throwable) {
    coreRunning.set(false)
    commandClient = null
    reportError("Mobile.start failed", throwable)
    Result.failure(throwable)
    }
  }

  fun stop(): Result<Unit> = try {
    commandClient?.disconnect()
    commandClient = null
    Mobile.stop()
    coreRunning.set(false)
    VpnEventBus.emitState("stopped", "VPN core stopped")
    Result.success(Unit)
  } catch (throwable: Throwable) {
    coreRunning.set(false)
    commandClient = null
    reportError("Mobile.stop failed", throwable)
    Result.failure(throwable)
  }

  fun isRunning(): Boolean = coreRunning.get()

  fun getStats(): TrafficStats = synchronized(statsLock) { lastStats }

  private fun createCommandHandler() = object : CommandClientHandler {
    override fun connected() = VpnEventBus.emitState("connected", "Connected to Hiddify core")

    override fun disconnected(reason: String) = VpnEventBus.emitState("error", reason)

    override fun clearLogs() = VpnEventBus.clearLogs()
    override fun initializeClashMode(iter: StringIterator, mode: String) = Unit
    override fun setDefaultLogLevel(level: Int) = Unit
    override fun updateClashMode(mode: String) = Unit
    override fun writeConnectionEvents(events: ConnectionEvents) = Unit
    override fun writeGroups(groups: OutboundGroupIterator) = Unit

    override fun writeStatus(message: StatusMessage) {
      val stats = TrafficStats(
        uploadBytes = message.getUplinkTotal(),
        downloadBytes = message.getDownlinkTotal(),
        uploadSpeed = message.getUplink(),
        downloadSpeed = message.getDownlink(),
      )
      synchronized(statsLock) { lastStats = stats }
      VpnEventBus.emitTraffic(VpnEventBus.TrafficEvent(
        stats.uploadBytes, stats.downloadBytes, stats.uploadSpeed, stats.downloadSpeed,
      ))
    }

    override fun writeLogs(logs: LogIterator) {
      while (logs.hasNext()) {
        // The bundled v4.1.0 AAR exposes LogEntry rather than a raw String.
        val entry = logs.next()
        VpnEventBus.emitLog(logLevel(entry.getLevel()), entry.getMessage())
      }
    }
  }

  private fun logLevel(level: Int): String = when (level) {
    0 -> "info"
    1 -> "warn"
    2 -> "error"
    else -> "info"
  }

  private fun reportError(operation: String, throwable: Throwable) {
    val message = "$operation: ${throwable.message ?: throwable.javaClass.simpleName}"
    VpnEventBus.emitLog("error", message)
    VpnEventBus.emitState("error", message)
  }

  companion object {
    private val setupOnce = AtomicBoolean(false)
    private val coreRunning = AtomicBoolean(false)
  }
}
