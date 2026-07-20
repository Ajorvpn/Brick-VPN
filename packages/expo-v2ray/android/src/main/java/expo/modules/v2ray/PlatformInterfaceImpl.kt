package expo.modules.v2ray

import android.content.Context
import android.net.IpPrefix
import android.os.Build
import com.hiddify.core.libbox.ConnectionOwner
import com.hiddify.core.libbox.InterfaceUpdateListener
import com.hiddify.core.libbox.Libbox
import com.hiddify.core.libbox.LocalDNSTransport
import com.hiddify.core.libbox.NetworkInterfaceIterator
import com.hiddify.core.libbox.Notification
import com.hiddify.core.libbox.PlatformInterface
import com.hiddify.core.libbox.RoutePrefixIterator
import com.hiddify.core.libbox.StringIterator
import com.hiddify.core.libbox.TunOptions
import com.hiddify.core.libbox.WIFIState
import java.net.InetAddress

class PlatformInterfaceImpl(private val vpnService: ExpoV2rayVpnService) : PlatformInterface {
  private val context: Context = vpnService.applicationContext

  override fun openTun(options: TunOptions): Int = try {
    VpnEventBus.emitLog("info", "Opening VPN TUN interface")
    val builder = vpnService.getVpnBuilder().setMtu(options.getMTU()).setSession("Brick VPN")
    addAddresses(builder, options.getInet4Address())
    addAddresses(builder, options.getInet6Address())

    if (options.getAutoRoute()) {
      VpnEventBus.emitLog("info", "Applying automatic default routes")
      builder.addRoute("0.0.0.0", 0).addRoute("::", 0)
    } else {
      VpnEventBus.emitLog("info", "Applying explicit routes")
      addRoutes(builder, options.getInet4RouteAddress())
      addRoutes(builder, options.getInet6RouteAddress())
    }
    addExcludedRoutes(builder, options.getInet4RouteExcludeAddress())
    addExcludedRoutes(builder, options.getInet6RouteExcludeAddress())

    options.getDNSServerAddress().getValue().takeIf { it.isNotBlank() }?.let {
      builder.addDnsServer(it)
      VpnEventBus.emitLog("info", "Applied DNS server $it")
    }

    val includes = mutableListOf<String>()
    val includeIterator = options.getIncludePackage()
    while (includeIterator.hasNext()) includes += includeIterator.next()
    if (includes.isNotEmpty()) {
      includes.forEach { builder.addAllowedApplication(it) }
      VpnEventBus.emitLog("info", "Applied ${includes.size} allowed application(s)")
    } else {
      val excludes = options.getExcludePackage()
      while (excludes.hasNext()) builder.addDisallowedApplication(excludes.next())
      builder.addDisallowedApplication(context.packageName)
      VpnEventBus.emitLog("info", "Applied excluded applications and excluded VPN app")
    }

    val pfd = builder.establish()
    if (pfd == null) {
      VpnEventBus.emitLog("error", "VPN TUN establishment returned null")
      VpnEventBus.emitState("error", "Unable to establish VPN TUN interface")
      -1
    } else {
      vpnService.markTunEstablished()
      VpnEventBus.emitLog("info", "VPN TUN interface established")
      pfd.detachFd()
    }
  } catch (throwable: Throwable) {
    val message = "openTun failed: ${throwable.message ?: throwable.javaClass.simpleName}"
    VpnEventBus.emitLog("error", message)
    VpnEventBus.emitState("error", message)
    -1
  }

  private fun addAddresses(builder: android.net.VpnService.Builder, routes: RoutePrefixIterator) {
    while (routes.hasNext()) routes.next().let { builder.addAddress(it.address(), it.prefix()) }
  }

  private fun addRoutes(builder: android.net.VpnService.Builder, routes: RoutePrefixIterator) {
    while (routes.hasNext()) routes.next().let { builder.addRoute(it.address(), it.prefix()) }
  }

  private fun addExcludedRoutes(builder: android.net.VpnService.Builder, routes: RoutePrefixIterator) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    while (routes.hasNext()) {
      val route = routes.next()
      try {
        builder.excludeRoute(IpPrefix(InetAddress.getByName(route.address()), route.prefix()))
      } catch (throwable: Throwable) {
        VpnEventBus.emitLog("error", "Unable to exclude route ${route.string()}: ${throwable.message}")
      }
    }
  }

  override fun autoDetectInterfaceControl(interfaceType: Int) = Unit
  override fun clearDNSCache() = Unit
  override fun closeDefaultInterfaceMonitor(listener: InterfaceUpdateListener) = Unit
  override fun findConnectionOwner(interfaceType: Int, interfaceName: String, type: Int, name: String, flags: Int): ConnectionOwner? = null
  override fun getInterfaces(): NetworkInterfaceIterator? = null
  override fun includeAllNetworks(): Boolean = false
  override fun localDNSTransport(): LocalDNSTransport? = null
  override fun readWIFIState(): WIFIState = Libbox.newWIFIState("", "")
  override fun sendNotification(notification: Notification) = Unit
  override fun startDefaultInterfaceMonitor(listener: InterfaceUpdateListener) = Unit
  override fun systemCertificates(): StringIterator? = null
  override fun underNetworkExtension(): Boolean = false
  override fun usePlatformAutoDetectInterfaceControl(): Boolean = true
  override fun useProcFS(): Boolean = false
}
