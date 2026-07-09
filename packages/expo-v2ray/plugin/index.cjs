const { withAndroidColors, withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withExpoV2ray(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.application?.[0];

    if (!application) {
      return config;
    }

    manifest['uses-permission'] = manifest['uses-permission'] || [];
    const requiredPermissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.POST_NOTIFICATIONS',
    ];

    for (const permissionName of requiredPermissions) {
      const exists = manifest['uses-permission'].some((entry) => entry.$['android:name'] === permissionName);
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': permissionName },
        });
      }
    }

    const service = {
      $: {
        'android:name': '.ExpoV2rayVpnService',
        'android:exported': 'false',
        'android:permission': 'android.permission.BIND_VPN_SERVICE',
        'android:foregroundServiceType': 'specialUse',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.net.VpnService' } }],
        },
      ],
    };

    application.service = application.service || [];
    const alreadyPresent = application.service.some((entry) => entry.$['android:name'] === '.ExpoV2rayVpnService');
    if (!alreadyPresent) {
      application.service.push(service);
    }

    return config;
  });

  return withAndroidColors(config, (config) => {
    const colors = config.modResults;

    if (!colors.resources?.color?.some((entry) => entry.$?.name === 'splashscreen_background')) {
      colors.resources = colors.resources || {};
      colors.resources.color = colors.resources.color || [];
      colors.resources.color.push({
        $: { name: 'splashscreen_background' },
        _: '#ffffff',
      });
    }

    return config;
  });
};
