# Brick VPN — AGENTS.md

Universal instructions for AI coding assistants (GitHub Copilot, Cursor, Claude Code, Windsurf, Aider, and others). This file is the source of truth for project-specific facts. General engineering principles live in `.github/copilot-instructions.md`.

## Stack

- Monorepo: pnpm 9.0.0 + Turborepo 2.x
- Workspace layout: `apps/*` and `packages/*`
- App: React Native 0.74.5 + Expo SDK 51 (Hermes JS engine, Old Architecture — `newArchEnabled=false`)
- Language: TypeScript 5.3.3 (strict mode), Kotlin (JDK 17, target JVM 17)
- State management: Zustand 5.0.14 with persist middleware
- Persistence: `@react-native-async-storage/async-storage` 1.23.1
- Navigation: `@react-navigation/*` v6 (Bottom Tabs + Native Stack)
- Native bridge: Expo Modules (`expo-modules-core` 1.12.26). NOT TurboModule, NOT classic RN Bridge.
- Android: Gradle 8.8, NDK 26.1.10909125, compileSdk 34, minSdk 23
- VPN core: Hiddify `libbox.aar` at `packages/expo-v2ray/android/libs/libbox.aar` (v4.x, gomobile-bound Go library)

## Packages

- `apps/mobile` — the Expo app
- `packages/core-api` — pure TS logic: config parser, Zustand stores, types
- `packages/expo-v2ray` — Expo native module wrapping libbox
- `packages/ui-theme` — theme tokens

## VPN flow (canonical)

```
User taps Start
  → useVpnActions.handleStart()
  → expoV2ray.prepareVpn()                    // requests android.net.VpnService permission
  → expoV2ray.startVpn(configJson)            // configJson is a sing-box JSON string
  → ExpoV2rayModule.startVpn (Kotlin, Expo Module)
  → VpnServiceController.startVpn             // startForegroundService
  → ExpoV2rayVpnService.onStartCommand        // extends android.net.VpnService
  → HiddifyCoreController.setup() + start(configJson)
  → libbox.aar (Go core) invokes PlatformInterfaceImpl.openTun
  → VpnService.Builder.establish() returns TUN FD
  → VpnEventBus emits state="connected"
```

## Coding Conventions

### TypeScript

- 2-space indent
- Named exports with `export const` + arrow functions
- Zustand stores live in `packages/core-api/src/stores/`
- Custom hooks in `apps/mobile/src/hooks/use*.ts`
- Components: `PascalCase.tsx`; utilities/hooks/stores: `kebab-case.ts`
- Strict types: no `any`, prefer `unknown` + narrowing
- No default exports for components (use named)

### Kotlin

- 2-space indent
- Package: `expo.modules.v2ray`
- Errors surfaced via BOTH `VpnEventBus.emitLog("error", ...)` AND `VpnEventBus.emitState("error", ...)`
- Return `Result<Unit>` from setup/start/stop
- `AtomicBoolean` companion flags for one-shot initialization
- Coroutines: `Dispatchers.IO + SupervisorJob()`

## Forbidden Technologies (do NOT introduce)

- ❌ Flutter / Dart / MethodChannel
- ❌ Redux / MobX / Context API for global state (use Zustand)
- ❌ TurboModule / Fabric / New Architecture code
- ❌ kotlinx-serialization (use `Map<String, Any>` and raw JSON strings)
- ❌ Retrofit / OkHttp for internal IPC
- ❌ SharedPreferences for user data (JS layer owns persistence via Zustand + AsyncStorage)
- ❌ gRPC clients on the Kotlin side (libbox exposes direct APIs — use them)

## libbox AAR — Verified API surface (from `javap -p`)

### Use these

```java
// Low-level (static)
com.hiddify.core.libbox.Libbox.redirectStderr(String path)        // MUST call for Go panic capture
com.hiddify.core.libbox.Libbox.setMemoryLimit(boolean)
com.hiddify.core.libbox.Libbox.checkConfig(String configJson)     // validates sing-box JSON
com.hiddify.core.libbox.Libbox.formatConfig(String) -> StringBox
com.hiddify.core.libbox.Libbox.version() -> String
com.hiddify.core.libbox.Libbox.newStandaloneCommandClient()       // for stats/logs polling later

// The REAL entry point for starting a VPN session
com.hiddify.core.libbox.CommandServer(CommandServerHandler, PlatformInterface)
  .start()                                                  // starts command server
  .startOrReloadService(String configJson, OverrideOptions) // ★ loads sing-box config
  .closeService()
  .close()

// Implement these interfaces
com.hiddify.core.libbox.PlatformInterface
com.hiddify.core.libbox.CommandServerHandler
com.hiddify.core.libbox.CommandClientHandler   // when stats added
```

### Do NOT use

- ❌ `com.hiddify.core.mobile.Mobile.*` — Flutter-oriented wrapper that starts an internal gRPC server. Adds complexity we don't need.
- ❌ `com.hiddify.core.mobile.SetupOptions` — OLD schema. Use `com.hiddify.core.libbox.SetupOptions` if `Libbox.setup` is ever needed.

## File Ownership Boundaries

Native module lives entirely under:

- `packages/expo-v2ray/android/src/main/java/expo/modules/v2ray/*.kt`
- `packages/expo-v2ray/src/*.ts`
- `packages/expo-v2ray/android/src/main/AndroidManifest.xml`
- `packages/expo-v2ray/android/build.gradle`
- `packages/expo-v2ray/plugin/index.cjs`

**Do NOT** modify these when fixing VPN core issues (unless explicitly requested):

- `packages/core-api/src/config-parser.ts` (sing-box JSON generator)
- `packages/expo-v2ray/android/src/main/java/expo/modules/v2ray/PlatformInterfaceImpl.kt`
- Anything under `apps/mobile/android/app/`

## Build & Test Commands

```bash
# Typecheck all packages (fast, always safe to run)
pnpm typecheck

# Build debug APK (from repo root)
cd apps/mobile/android && ./gradlew app:assembleDebug

# Reinstall APK on connected device
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk

# View live VPN logs
adb logcat -c && adb logcat AndroidRuntime:E "*:F" | grep -iE "brick|libhiddify|libbox|panic|SIG"

# Read Go stderr (after VPN start)
adb shell "run-as com.brick.app cat files/working/stderr.log"
```

## Debugging Rules

When a VPN startup issue is reported:

1. FIRST read the exact error from the Debug Logs screen + `adb logcat`
2. Never blame `config-parser.ts` unless `Libbox.checkConfig` confirms invalid JSON
3. Never modify `PlatformInterfaceImpl.kt` unless AAR API signatures changed (verified via `javap`)
4. Root cause is almost always in `HiddifyCoreController.kt` sequencing
5. If Go core panics silently, `stderr.log` is the source of truth — read its last 4KB and surface it
