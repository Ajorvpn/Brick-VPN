package expo.modules.v2ray

import android.content.Context
import android.net.ConnectivityManager
import android.net.IpPrefix
import android.os.Build
import com.hiddify.core.libbox.ConnectionOwner
import com.hiddify.core.libbox.InterfaceUpdateListener
import com.hiddify.core.libbox.Libbox
import com.hiddify.core.libbox.LocalDNSTransport
import com.hiddify.core.libbox.NetworkInterface as LibboxNetworkInterface
import com.hiddify.core.libbox.NetworkInterfaceIterator
import com.hiddify.core.libbox.Notification
import com.hiddify.core.libbox.PlatformInterface
import com.hiddify.core.libbox.RoutePrefixIterator
import com.hiddify.core.libbox.StringIterator
import com.hiddify.core.libbox.TunOptions
import com.hiddify.core.libbox.WIFIState
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NetworkInterface as JavaNetworkInterface
import java.security.KeyStore
import java.security.cert.X509Certificate
import java.util.Base64

class PlatformInterfaceImpl(private val vpnService: ExpoV2rayVpnService) : PlatformInterface {
  private val context: Context = vpnService.applicationContext

  private val connectivityManager: ConnectivityManager? by lazy {
    vpnService.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
  }

  @Volatile
  private var defaultInterfaceListener: InterfaceUpdateListener? = null

  private val systemCertsPem: List<String> by lazy {
    try {
      val ks = KeyStore.getInstance("AndroidCAStore")
      ks.load(null, null)
      val aliases = ks.aliases()
      val out = mutableListOf<String>()
      while (aliases.hasMoreElements()) {
        val alias = aliases.nextElement()
        val cert = ks.getCertificate(alias) as? X509Certificate ?: continue
        val encoded = Base64.getEncoder().encodeToString(cert.encoded)
        val pem = buildString {
          append("-----BEGIN CERTIFICATE-----\n")
          var i = 0
          while (i < encoded.length) {
            val end = (i + 64).coerceAtMost(encoded.length)
            append(encoded.substring(i, end))
            append('\n')
            i = end
          }
          append("-----END CERTIFICATE-----\n")
        }
        out.add(pem)
      }
      VpnEventBus.emitLog("info", "Loaded ${out.size} system CA certificates")
      out
    } catch (t: Throwable) {
      VpnEventBus.emitLog("warn", "Failed to load system CAs: ${t.message}")
      emptyList()
    }
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

    // Always self-exclude to prevent VPN app's own traffic from looping through TUN
    builder.addDisallowedApplication(context.packageName)

    val includes = mutableListOf<String>()
    val includeIterator = options.getIncludePackage()
    while (includeIterator.hasNext()) includes += includeIterator.next()
    if (includes.isNotEmpty()) {
      includes.forEach { builder.addAllowedApplication(it) }
      VpnEventBus.emitLog("info", "Applied ${includes.size} allowed application(s)")
    } else {
      val excludes = options.getExcludePackage()
      while (excludes.hasNext()) builder.addDisallowedApplication(excludes.next())
      VpnEventBus.emitLog("info", "Applied excluded applications")
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
    if (fd < 0) return
    val ok = vpnService.protect(fd)
    if (!ok) {
      VpnEventBus.emitLog("warn", "vpnService.protect($fd) returned false")
    }
  }

  override fun clearDNSCache() = Unit

  override fun startDefaultInterfaceMonitor(listener: InterfaceUpdateListener) {
    defaultInterfaceListener = listener
    VpnEventBus.emitLog("info", "Default interface monitor registered")
  }

  override fun closeDefaultInterfaceMonitor(listener: InterfaceUpdateListener) {
    if (defaultInterfaceListener === listener) defaultInterfaceListener = null
  }

  override fun findConnectionOwner(
    ipProtocol: Int,
    sourceAddress: String,
    sourcePort: Int,
    destinationAddress: String,
    destinationPort: Int,
  ): ConnectionOwner {
    val owner = ConnectionOwner()
    owner.setUserId(-1)

    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      return owner
    }

    return try {
      val cm = connectivityManager ?: return owner
      val local = InetSocketAddress(sourceAddress, sourcePort)
      val remote = InetSocketAddress(destinationAddress, destinationPort)
      val uid = cm.getConnectionOwnerUid(ipProtocol, local, remote)
      if (uid < 0) return owner
      owner.setUserId(uid)
      val packageName = vpnService.applicationContext.packageManager
        .getPackagesForUid(uid)?.firstOrNull()
      if (packageName != null) {
        owner.setAndroidPackageName(packageName)
        owner.setUserName(packageName)
      }
      owner
    } catch (throwable: Throwable) {
      VpnEventBus.emitLog("warn", "findConnectionOwner lookup failed: ${throwable.message}")
      owner
    }
  }

  override fun getInterfaces(): NetworkInterfaceIterator {
    val boxInterfaces = mutableListOf<LibboxNetworkInterface>()
    try {
      val cm = connectivityManager
      val javaIfaces = JavaNetworkInterface.getNetworkInterfaces() ?: return EmptyInterfaceIterator

      val ifaceMetadata = mutableMapOf<String, Pair<Int, Boolean>>()
      val ifaceDns = mutableMapOf<String, List<String>>()
      if (cm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        try {
          for (network in cm.allNetworks) {
            val lp = cm.getLinkProperties(network) ?: continue
            val caps = cm.getNetworkCapabilities(network) ?: continue
            val name = lp.interfaceName ?: continue
            val type = when {
              caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI) -> Libbox.InterfaceTypeWIFI
              caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_CELLULAR) -> Libbox.InterfaceTypeCellular
              caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_ETHERNET) -> Libbox.InterfaceTypeEthernet
              else -> Libbox.InterfaceTypeOther
            }
            val metered = !caps.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
            ifaceMetadata[name] = Pair(type, metered)
            ifaceDns[name] = lp.dnsServers.mapNotNull { it.hostAddress }
          }
        } catch (t: Throwable) {
          VpnEventBus.emitLog("warn", "Failed to enumerate networks: ${t.message}")
        }
      }

      for (javaIface in javaIfaces.toList()) {
        val boxIface = LibboxNetworkInterface()
        boxIface.name = javaIface.name
        boxIface.index = javaIface.index
        try { boxIface.mtu = javaIface.mtu } catch (_: Throwable) { boxIface.mtu = 1500 }
        val addresses = javaIface.interfaceAddresses.mapNotNull { addr ->
          addr.address?.hostAddress?.let { "$it/${addr.networkPrefixLength}" }
        }
        boxIface.addresses = SimpleStringIterator(addresses.iterator())
        val (type, metered) = ifaceMetadata[javaIface.name] ?: Pair(Libbox.InterfaceTypeOther, false)
        boxIface.type = type
        boxIface.metered = metered
        boxIface.dnsServer = SimpleStringIterator((ifaceDns[javaIface.name] ?: emptyList()).iterator())
        var flags = 0
        try {
          if (javaIface.isUp) flags = flags or 0x1
          if (javaIface.isLoopback) flags = flags or 0x8
          if (javaIface.isPointToPoint) flags = flags or 0x10
          if (javaIface.supportsMulticast()) flags = flags or 0x1000
        } catch (_: Throwable) {}
        boxIface.flags = flags
        boxInterfaces.add(boxIface)
      }
    } catch (throwable: Throwable) {
      VpnEventBus.emitLog("warn", "getInterfaces failed: ${throwable.message}")
    }
    return SimpleInterfaceIterator(boxInterfaces.iterator())
  }

  override fun includeAllNetworks(): Boolean = false

  override fun localDNSTransport(): LocalDNSTransport? = null

  override fun readWIFIState(): WIFIState = Libbox.newWIFIState("", "")
  override fun sendNotification(notification: Notification) = Unit
  override fun systemCertificates(): StringIterator = SimpleStringIterator(systemCertsPem)
  override fun underNetworkExtension(): Boolean = false
  override fun usePlatformAutoDetectInterfaceControl(): Boolean = true
  override fun useProcFS(): Boolean = false

  private class SimpleStringIterator(private val list: List<String>) : StringIterator {
    constructor(iterator: Iterator<String>) : this(iterator.asSequence().toList())
    private var index = 0
    override fun hasNext(): Boolean = index < list.size
    override fun next(): String = list[index++]
    override fun len(): Int = list.size
  }

  private class SimpleInterfaceIterator(
    private val iterator: Iterator<LibboxNetworkInterface>,
  ) : NetworkInterfaceIterator {
    override fun hasNext(): Boolean = iterator.hasNext()
    override fun next(): LibboxNetworkInterface = iterator.next()
  }

  private object EmptyInterfaceIterator : NetworkInterfaceIterator {
    override fun hasNext(): Boolean = false
    override fun next(): LibboxNetworkInterface = throw NoSuchElementException()
  }
}
