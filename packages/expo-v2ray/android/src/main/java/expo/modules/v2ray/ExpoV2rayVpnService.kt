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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class ExpoV2rayVpnService : VpnService() {
  private var coreController: HiddifyCoreController? = null
  @Volatile
  private var tunEstablished = false
  private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

  override fun onCreate() {
    super.onCreate()
    instance = this
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
    val config = intent?.getStringExtra(EXTRA_CONFIG)
    if (config.isNullOrBlank()) {
      VpnEventBus.emitLog("error", "VPN config must not be empty")
      VpnEventBus.emitState("error", "VPN config must not be empty")
      stopSelf(startId)
      return START_NOT_STICKY
    }
    tunEstablished = false
    coreController = HiddifyCoreController(this)
    scope.launch {
      val controller = coreController ?: return@launch
      if (controller.setup().isSuccess) controller.start(config)
    }
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    stopForeground(STOP_FOREGROUND_REMOVE)
    coreController?.stop()
    tunEstablished = false
    scope.cancel()
    instance = null
    super.onDestroy()
  }

  fun getVpnBuilder(): Builder = Builder()

  fun markTunEstablished() {
    tunEstablished = true
  }

  fun hasTunEstablished(): Boolean = tunEstablished

  fun isCoreRunning(): Boolean = coreController?.isRunning() == true

  fun getCurrentStats(): TrafficStats? = coreController?.getStats()

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
      .setContentText("VPN bridge service is running")
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setOngoing(true)
      .build()
  }

  companion object {
    const val EXTRA_CONFIG = "config"

    @Volatile
    var instance: ExpoV2rayVpnService? = null
  }
}
