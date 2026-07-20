package expo.modules.v2ray

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat

class VpnServiceController(private val context: Context) {
  private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  fun startVpn(activity: Context, config: String): Map<String, Any> {
    if (config.isBlank()) {
      throw IllegalArgumentException("VPN config must not be empty")
    }

    val intent = Intent(activity, ExpoV2rayVpnService::class.java).apply {
      putExtra(ExpoV2rayVpnService.EXTRA_CONFIG, config)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      ContextCompat.startForegroundService(activity, intent)
    } else {
      activity.startService(intent)
    }

    return mapOf(
      "state" to "starting",
      "connected" to false,
      "message" to "Starting VPN service.",
    )
  }

  fun stopVpn(): Map<String, Any> {
    val intent = Intent(context, ExpoV2rayVpnService::class.java)
    context.stopService(intent)
    notificationManager.cancel(NOTIFICATION_ID)
    return mapOf(
      "state" to "stopping",
      "connected" to false,
      "message" to "Stopping VPN service.",
    )
  }

  fun getStatus(): Map<String, Any> {
    val instance = ExpoV2rayVpnService.instance
    if (instance == null) {
      return mapOf(
        "state" to "stopped",
        "connected" to false,
        "message" to "VPN service is stopped.",
      )
    }
    val coreRunning = instance.isCoreRunning()
    val tunUp = instance.hasTunEstablished()
    val connected = coreRunning && tunUp
    return mapOf(
      "state" to if (connected) "connected" else "starting",
      "connected" to connected,
      "message" to if (connected) "VPN is connected." else "VPN service is starting.",
    )
  }

  fun getRecentLogs(): List<String> = VpnEventBus.recentLogs()

  fun getTrafficStats(): Map<String, Long> {
    val stats = ExpoV2rayVpnService.instance?.getCurrentStats()
    return mapOf(
      "uploadBytes" to (stats?.uploadBytes ?: 0L),
      "downloadBytes" to (stats?.downloadBytes ?: 0L),
      "uploadSpeed" to (stats?.uploadSpeed ?: 0L),
      "downloadSpeed" to (stats?.downloadSpeed ?: 0L),
    )
  }

  companion object {
    const val CHANNEL_ID = "expo_v2ray_vpn"
    const val NOTIFICATION_ID = 1
  }
}
