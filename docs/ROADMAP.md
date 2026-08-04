# Roadmap

Development plan for Brick VPN. Milestones are sequential unless noted.

## M0 — Build Foundation

Objective: Reliable build pipeline. All contributors can build the debug APK on Linux/macOS with a documented setup.

Scope:
- Version-pinned toolchain (AGP, Gradle, Kotlin, JDK, NDK) via `libs.versions.toml`
- Gradle mirror fallback for restricted networks (`-PuseCnMirror`)
- ABI splits and universal APK for direct distribution
- ProGuard/R8 keep rules for libbox
- `android:allowBackup="false"`
- GitHub Actions: lint + typecheck + PR build without secrets

Blocker: AGP 8.5.x Maven resolution.

## M1 — VPN Core Reliability

Objective: Working VPN tunnel with all supported protocols. Clean lifecycle across start/stop/reconnect cycles.

Scope:
- Complete `PlatformInterface` implementation (verified against SagerNet reference)
- Non-blocking service lifecycle, no ANR on aggressive stop/start
- Event-driven traffic stats via `CommandClient`
- Config validated via `Libbox.checkConfig` before load
- Test matrix: VLESS+Reality, VMess+WS, Trojan+TLS, Shadowsocks 2022, Hysteria2, TUIC v5
- MTU 1400 default with 1280 toggle for constrained networks

## M2 — Security Hardening

Objective: Audit-ready security posture.

Scope:
- Tiered secrets storage: `expo-secure-store` for keys, `react-native-mmkv` (≥2.11.0) for state cache
- Log sanitizer (UUIDs, IPs, hostnames, credentials)
- Leak prevention: IPv6, DNS, connect-transition (documented AOSP limitation), network-change
- Kill switch guidance via deep-link to system Always-on VPN settings
- Malicious config scanner: reject `allowInsecure`, RFC1918 servers, exposed Clash API
- APK v2+v3 signing (v1 disabled — Janus)
- GPG-signed release artifacts + SHA256SUMS
- CycloneDX SBOM per release
- Threat model documented

## M3 — Performance & Reliability

Objective: Battery-conscious, resilient under network churn.

Scope:
- XState-based lifecycle FSM with exponential backoff reconnect
- Go runtime tuning: `GOMEMLIMIT`, `GOGC`
- Foreground notification at `IMPORTANCE_MIN`
- Wake locks scoped to discrete operations only
- Network change handling via `ConnectivityManager.NetworkCallback` (debounced)
- Liveness probe for "tunnel up, no traffic" detection

## M4 — Subscription Layer

Objective: Reliable server distribution including built-in free tier.

Scope:
- Bootstrap list + CDN cascading fallback
- Parsers: v2rayN base64, Clash/Meta YAML, sing-box native JSON
- WorkManager 12h refresh + emergency refresh on total failure
- Health checks via `urltest` outbound
- Import: URL, JSON, QR, file, share intent
- Optional PGP signature verification for built-in subscriptions

## M5 — Testing & CI

Objective: Automated verification gates on every PR.

Scope:
- Unit tests: TS (config parser, stores, hooks), Kotlin (PlatformInterface, lifecycle)
- Integration tests via `LibboxGateway` fake
- E2E via Maestro (black-box)
- Matrix: API 26/28/30/33/34/35 nightly
- Connection SLA benchmark (< 5s target)

## M6 — Release Pipeline

Objective: Reproducible, signed, verifiable releases.

Scope:
- Release automation on git tag
- F-Droid metadata + inclusion
- In-app update via GitHub Releases API (signature-verified)
- Canary/Beta/Stable channels
- Docker-based reproducible build environment
- `diffoscope` verification in CI
- CalVer for app versions (`YYYY.MM.PATCH`)

## M7 — Cross-Platform Foundation

Objective: Interface boundaries that allow iOS/Desktop later without rewrites.

Scope:
- `VpnBackend` TypeScript interface in `packages/core-api`
- Audit `packages/core-api` for Android-only imports
- New Architecture migration
- Document VpnService vs NEPacketTunnelProvider abstraction
- Desktop strategy (React Native Windows/macOS vs alternatives)

---

## Progress Overview

| Milestone | Status | Progress |
|-----------|--------|----------|
| M0 | In progress | 40% |
| M1 | In progress | 60% |
| M2 | Waiting | 15% |
| M3 | Waiting | 20% |
| M4 | Waiting | 5% |
| M5 | Waiting | 0% |
| M6 | Waiting | 0% |
| M7 | Waiting | 0% |

Overall: ~18%
