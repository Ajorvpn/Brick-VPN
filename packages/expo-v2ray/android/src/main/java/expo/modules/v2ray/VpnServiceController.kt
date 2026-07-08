package expo.modules.v2ray

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class VpnServiceController(private val context: Context) {
  private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  private var currentState = "idle"

  fun startVpn(activity: Context, config: String): Map<String, Any> {
    if (config.isBlank()) {
      throw IllegalArgumentException("VPN config must not be empty")
    }

    val intent = Intent(activity, ExpoV2rayVpnService::class.java).apply {
      putExtra(EXTRA_CONFIG, config)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      ContextCompat.startForegroundService(activity, intent)
    } else {
      activity.startService(intent)
    }

    currentState = "service-started"
    return mapOf(
      "state" to currentState,
      "connected" to false,
      "message" to "Service running, VPN core not yet integrated.",
    )
  }

  fun stopVpn(): Map<String, Any> {
    val intent = Intent(context, ExpoV2rayVpnService::class.java)
    context.stopService(intent)
    notificationManager.cancel(NOTIFICATION_ID)
    currentState = "stopped"
    return mapOf(
      "state" to currentState,
      "connected" to false,
      "message" to "VPN service stopped.",
    )
  }

  fun getStatus(): Map<String, Any> {
    val message = when (currentState) {
      "service-started" -> "Service running, VPN core not yet integrated."
      "stopped" -> "VPN service stopped."
      "idle" -> "VPN bridge is idle."
      "error" -> "VPN bridge is in an error state."
      else -> "VPN bridge scaffold is ready for future core integration."
    }

    return mapOf(
      "state" to currentState,
      "connected" to (currentState == "connected"),
      "message" to message,
    )
  }

  companion object {
    const val CHANNEL_ID = "expo_v2ray_vpn"
    const val NOTIFICATION_ID = 1
    const val EXTRA_CONFIG = "expo_v2ray.config"
  }
}
