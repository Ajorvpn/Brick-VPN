package expo.modules.v2ray

import android.content.Context
import android.net.ConnectivityManager
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
import java.net.InetSocketAddress

class PlatformInterfaceImpl(private val vpnService: ExpoV2rayVpnService) : PlatformInterface {
  private val context: Context = vpnService.applicationContext

  private val connectivityManager: ConnectivityManager? by lazy {
    vpnService.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
  }

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

  override fun autoDetectInterfaceControl(fd: Int) {
    // sing-box passes a raw socket FD here; we MUST protect() it or traffic loops
    // (gomobile strips the param name to 'interfaceType', but the value is an FD)
    if (fd < 0) return
    val ok = vpnService.protect(fd)
    if (!ok) {
      VpnEventBus.emitLog("warn", "vpnService.protect($fd) returned false")
    }
  }

  override fun clearDNSCache() = Unit
  override fun closeDefaultInterfaceMonitor(listener: InterfaceUpdateListener) = Unit

  override fun findConnectionOwner(
    ipProtocol: Int,
    sourceAddress: String,
    sourcePort: Int,
    destinationAddress: String,
    destinationPort: Int,
  ): ConnectionOwner {
    // Always return a valid ConnectionOwner (never null) to prevent Go SIGSEGV.
    // If lookup fails, return one with userId=-1 (Process.INVALID_UID).
    val owner = ConnectionOwner()
    owner.setUserId(-1)

    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      // getConnectionOwnerUid requires API 29+
      return owner
    }

    return try {
      val cm = connectivityManager ?: return owner

      // ipProtocol from sing-box is already OsConstants.IPPROTO_TCP (6) or IPPROTO_UDP (17)
      val local = InetSocketAddress(sourceAddress, sourcePort)
      val remote = InetSocketAddress(destinationAddress, destinationPort)

      val uid = cm.getConnectionOwnerUid(ipProtocol, local, remote)
      if (uid < 0) return owner

      owner.setUserId(uid)

      // Best-effort package name resolution (optional per sing-box; safe to skip on error)
      val packageName = vpnService.applicationContext.packageManager
        .getPackagesForUid(uid)?.firstOrNull()
      if (packageName != null) {
        owner.setAndroidPackageName(packageName)
        owner.setUserName(packageName)
      }

      owner
    } catch (throwable: Throwable) {
      VpnEventBus.emitLog("warn", "findConnectionOwner lookup failed: ${throwable.message}")
      owner // still valid, uid=-1
    }
  }

  override fun getInterfaces(): NetworkInterfaceIterator? = null
  override fun includeAllNetworks(): Boolean = false
  override fun localDNSTransport(): LocalDNSTransport? = null
  override fun readWIFIState(): WIFIState = Libbox.newWIFIState("", "")
  override fun sendNotification(notification: Notification) = Unit
  override fun startDefaultInterfaceMonitor(listener: InterfaceUpdateListener) = Unit
  override fun systemCertificates(): StringIterator? = null
  override fun underNetworkExtension(): Boolean = false
  override fun usePlatformAutoDetectInterfaceControl(): Boolean = true
  override fun useProcFS(): Boolean = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
}
