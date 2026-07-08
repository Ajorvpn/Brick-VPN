package expo.modules.v2ray

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.VpnService
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class ExpoV2rayVpnService : VpnService() {
  private val controller = VpnCoreController()

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    startForeground(
      VpnServiceController.NOTIFICATION_ID,
      buildForegroundNotification(),
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
      } else {
        0
      },
    )
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val config = intent?.getStringExtra(VpnServiceController.EXTRA_CONFIG)
    if (!config.isNullOrBlank()) {
      controller.start(config)
    }
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    stopForeground(STOP_FOREGROUND_REMOVE)
    controller.stop()
    super.onDestroy()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(NotificationManager::class.java) as NotificationManager
      val channel = NotificationChannel(
        VpnServiceController.CHANNEL_ID,
        "Expo V2Ray VPN",
        NotificationManager.IMPORTANCE_LOW,
      )
      manager.createNotificationChannel(channel)
    }
  }

  private fun buildForegroundNotification(): Notification {
    return NotificationCompat.Builder(this, VpnServiceController.CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_sys_warning)
      .setContentTitle("V2Ray VPN")
      .setContentText("VPN bridge service is running in scaffold mode")
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setOngoing(true)
      .build()
  }
}
