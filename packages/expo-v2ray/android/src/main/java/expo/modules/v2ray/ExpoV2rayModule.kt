package expo.modules.v2ray

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoV2rayModule : Module() {
  private val serviceController by lazy { VpnServiceController(appContext.reactContext) }
  private var pendingPreparePromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoV2ray")

    Events("onStateChanged", "onLog", "onTrafficUpdate")

    AsyncFunction("prepareVpn") { promise: Promise ->
      val activity = appContext.currentActivity ?: run {
        promise.reject("E_VPN_PREPARE", "No activity available for VPN permission flow", null)
        return@AsyncFunction
      }

      try {
        val intent = VpnService.prepare(activity)
        if (intent == null) {
          val result = mapOf(
            "ready" to true,
            "requiresUserConsent" to false,
            "state" to "ready",
            "message" to "VPN permission is already granted.",
          )
          emitState("ready", "VPN permission already granted")
          promise.resolve(result)
          return@AsyncFunction
        }

        pendingPreparePromise = promise
        emitState("preparing", "Requesting VPN permission from the user")
        activity.startActivityForResult(intent, VPN_PREPARE_REQUEST_CODE)
      } catch (throwable: Throwable) {
        promise.reject("E_VPN_PREPARE", throwable.message ?: "Failed to prepare VPN", throwable)
      }
    }

    OnActivityResult { _, requestCode, resultCode, _ ->
      if (requestCode != VPN_PREPARE_REQUEST_CODE) {
        return@OnActivityResult
      }

      val promise = pendingPreparePromise
      pendingPreparePromise = null
      val ready = resultCode == Activity.RESULT_OK
      val result = mapOf(
        "ready" to ready,
        "requiresUserConsent" to !ready,
        "state" to if (ready) "ready" else "preparing",
        "message" to if (ready) "VPN permission granted." else "VPN permission was denied or cancelled.",
      )

      if (ready) {
        emitState("ready", "VPN permission granted")
      } else {
        emitState("preparing", "VPN permission was denied")
      }

      promise?.resolve(result)
    }

    AsyncFunction("startVpn") { config: String, promise: Promise ->
      try {
        val activity = appContext.currentActivity ?: run {
          promise.reject("E_VPN_START", "No activity available for VPN service start", null)
          return@AsyncFunction
        }

        val result = serviceController.startVpn(activity, config)
        emitState("service-started", "Service running, VPN core not yet integrated.")
        emitLog("info", "VPN service start requested")
        promise.resolve(result)
      } catch (throwable: Throwable) {
        emitState("error", throwable.message ?: "Failed to start VPN")
        emitLog("error", throwable.message ?: "Failed to start VPN")
        promise.reject("E_VPN_START", throwable.message ?: "Failed to start VPN", throwable)
      }
    }

    AsyncFunction("stopVpn") { promise: Promise ->
      try {
        val result = serviceController.stopVpn()
        emitState("stopped", "VPN service stopped")
        emitLog("info", "VPN service stopped")
        promise.resolve(result)
      } catch (throwable: Throwable) {
        emitState("error", throwable.message ?: "Failed to stop VPN")
        emitLog("error", throwable.message ?: "Failed to stop VPN")
        promise.reject("E_VPN_STOP", throwable.message ?: "Failed to stop VPN", throwable)
      }
    }

    AsyncFunction("getStatus") { promise: Promise ->
      try {
        promise.resolve(serviceController.getStatus())
      } catch (throwable: Throwable) {
        promise.reject("E_VPN_STATUS", throwable.message ?: "Failed to read VPN status", throwable)
      }
    }
  }

  private fun emitState(state: String, message: String) {
    sendEvent("onStateChanged", mapOf("state" to state, "message" to message))
  }

  private fun emitLog(level: String, message: String) {
    sendEvent("onLog", mapOf("level" to level, "message" to message))
  }

  companion object {
    private const val VPN_PREPARE_REQUEST_CODE = 1001
  }
}
