package expo.modules.v2ray

import com.hiddify.core.libbox.CommandServer
import com.hiddify.core.libbox.CommandServerHandler
import com.hiddify.core.libbox.Libbox
import com.hiddify.core.libbox.OverrideOptions
import com.hiddify.core.libbox.SetupOptions
import com.hiddify.core.libbox.SystemProxyStatus
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

data class TrafficStats(
  val uploadBytes: Long,
  val downloadBytes: Long,
  val uploadSpeed: Long,
  val downloadSpeed: Long,
)

class HiddifyCoreController(private val vpnService: ExpoV2rayVpnService) {
  private val platformInterface = PlatformInterfaceImpl(vpnService)
  private var commandServer: CommandServer? = null
  private var workingDir: File = File(vpnService.filesDir, "working")
  private var basePath: File = vpnService.filesDir

  fun setup(): Result<Unit> {
    return try {
      basePath = vpnService.filesDir.apply { mkdirs() }
      workingDir = File(vpnService.filesDir, "working").apply { mkdirs() }
      val tempDir = vpnService.cacheDir.apply { mkdirs() }

      if (initializedOnce.compareAndSet(false, true)) {
        System.setProperty("GODEBUG", "stacktraceback=all")

        val stderrPath = File(workingDir, "stderr.log").absolutePath
        VpnEventBus.emitLog("info", "Redirecting Go stderr to $stderrPath")
        Libbox.redirectStderr(stderrPath)

        try {
          val basePathAbs = basePath.absolutePath
          val workingPathAbs = workingDir.absolutePath
          val tempPathAbs = tempDir.absolutePath
          Libbox.setup(SetupOptions().apply {
            setBasePath(basePathAbs)
            setWorkingPath(workingPathAbs)
            setTempPath(tempPathAbs)
            setFixAndroidStack(false)
            setCommandServerListenPort(0)
            setCommandServerSecret("")
            setLogMaxLines(1000L)
            setDebug(false)
          })
          VpnEventBus.emitLog(
            "info",
            "Libbox.setup completed (base=$basePathAbs, working=$workingPathAbs)",
          )
        } catch (t: Throwable) {
          VpnEventBus.emitLog("error", "Libbox.setup failed: ${t.message}")
          emitStderrTail(workingDir)
          throw t
        }

        Libbox.setMemoryLimit(true)
      }

      VpnEventBus.emitLog("info", "Hiddify core setup completed")
      Result.success(Unit)
    } catch (throwable: Throwable) {
      initializedOnce.set(false)
      reportError("Hiddify core setup failed", throwable)
      Result.failure(throwable)
    }
  }

  fun start(configJson: String): Result<Unit> {
    return try {
      if (!coreRunning.compareAndSet(false, true)) return Result.success(Unit)

      try {
        Libbox.checkConfig(configJson)
      } catch (t: Throwable) {
        emitStderrTail(workingDir)
        throw IllegalArgumentException("Invalid sing-box config: ${t.message}", t)
      }

      File(basePath, "current-config.json").writeText(configJson)

      val handler = object : CommandServerHandler {
        override fun getSystemProxyStatus(): SystemProxyStatus =
          SystemProxyStatus().apply {
            available = false
            enabled = false
          }

        override fun serviceReload() = Unit

        override fun serviceStop() {
          try {
            this@HiddifyCoreController.stop()
          } catch (_: Throwable) {
            // swallow
          }
        }

        override fun setSystemProxyEnabled(isEnabled: Boolean) = Unit

        override fun writeDebugMessage(message: String) {
          VpnEventBus.emitLog("info", message)
        }
      }

      val server = CommandServer(handler, platformInterface)
      commandServer = server
      server.start()

      VpnEventBus.emitState("starting", "Loading sing-box service")
      val overrideOptions = OverrideOptions().apply {
        setAutoRedirect(false)
      }
      server.startOrReloadService(configJson, overrideOptions)

      VpnEventBus.emitState("connected", "VPN service started")
      Result.success(Unit)
    } catch (throwable: Throwable) {
      coreRunning.set(false)
      commandServer = null
      reportError("Hiddify core start failed", throwable)
      Result.failure(throwable)
    }
  }

  fun stop(): Result<Unit> {
    val server = commandServer
    commandServer = null
    coreRunning.set(false)

    if (server == null) {
      VpnEventBus.emitState("stopped", "VPN core stopped")
      return Result.success(Unit)
    }

    runBlocking {
      val timedOut = withTimeoutOrNull(3_000L) {
        runCatching { server.closeService() }
          .onFailure { VpnEventBus.emitLog("warn", "closeService failed: ${it.message}") }
        runCatching { server.close() }
          .onFailure { VpnEventBus.emitLog("warn", "close failed: ${it.message}") }
        Unit
      }
      if (timedOut == null) {
        VpnEventBus.emitLog("warn", "CommandServer stop timed out after 3s; forcing shutdown")
      }
    }

    VpnEventBus.emitState("stopped", "VPN core stopped")
    return Result.success(Unit)
  }

  fun isRunning(): Boolean = coreRunning.get()

  fun getStats(): TrafficStats = TrafficStats(0L, 0L, 0L, 0L)

  private fun emitStderrTail(workingDir: File) {
    try {
      val f = File(workingDir, "stderr.log")
      if (f.exists()) {
        val tail = f.readText().takeLast(4000)
        if (tail.isNotBlank()) {
          VpnEventBus.emitLog("error", "=== Go stderr (last 4KB) ===\n$tail")
        }
      }
    } catch (_: Throwable) {
      // swallow
    }
  }

  private fun reportError(operation: String, throwable: Throwable) {
    val message = "$operation: ${throwable.message ?: throwable.javaClass.simpleName}"
    VpnEventBus.emitLog("error", message)
    VpnEventBus.emitState("error", message)
    emitStderrTail(workingDir)
  }

  companion object {
    private val initializedOnce = AtomicBoolean(false)
    private val coreRunning = AtomicBoolean(false)
  }
}
