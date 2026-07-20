package expo.modules.v2ray

import java.util.concurrent.CopyOnWriteArrayList

/** Process-wide bridge from the VPN service/core callbacks to the Expo module. */
object VpnEventBus {
  data class StateEvent(val state: String, val message: String)
  data class LogEvent(val level: String, val message: String)
  data class TrafficEvent(
    val uploadBytes: Long,
    val downloadBytes: Long,
    val uploadSpeed: Long,
    val downloadSpeed: Long,
  )

  interface Listener {
    fun onState(event: StateEvent) = Unit
    fun onLog(event: LogEvent) = Unit
    fun onTraffic(event: TrafficEvent) = Unit
  }

  private const val MAX_LOG_ENTRIES = 500
  private val listeners = CopyOnWriteArrayList<Listener>()
  private val logBuffer = ArrayDeque<String>(MAX_LOG_ENTRIES)

  fun addListener(listener: Listener) {
    listeners.addIfAbsent(listener)
  }

  fun removeListener(listener: Listener) {
    listeners.remove(listener)
  }

  fun emitState(state: String, message: String) {
    val event = StateEvent(state, message)
    listeners.forEach { it.onState(event) }
  }

  fun emitLog(level: String, message: String) {
    synchronized(logBuffer) {
      if (logBuffer.size == MAX_LOG_ENTRIES) logBuffer.removeFirst()
      logBuffer.addLast("$level:$message")
    }
    val event = LogEvent(level, message)
    listeners.forEach { it.onLog(event) }
  }

  fun emitTraffic(event: TrafficEvent) {
    listeners.forEach { it.onTraffic(event) }
  }

  fun recentLogs(): List<String> = synchronized(logBuffer) { logBuffer.toList() }

  fun clearLogs() {
    synchronized(logBuffer) { logBuffer.clear() }
  }
}
