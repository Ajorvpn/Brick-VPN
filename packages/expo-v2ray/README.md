# expo-v2ray

A local Expo Module scaffold for a future Android VPN bridge.

## Current phase
- Typed JavaScript API for prepare/start/stop/status
- Android Kotlin module entrypoints
- VpnService-based service scaffold
- Foreground notification and channel setup
- Placeholder boundary for future AAR-backed VPN core integration

## Future AAR placement
Place any future `.aar` artifacts in:

- `packages/expo-v2ray/android/libs/`

## Important note
This scaffold intentionally does not claim that a real VPN tunnel is working. The actual VPN core integration remains pending.
