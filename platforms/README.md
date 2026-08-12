# Burn Box platforms (Stage 2)

| Platform | Path | Shell | Status |
|----------|------|-------|--------|
| **Linux** | [`linux/`](./linux/) + [`desktop/`](./desktop/) | Electron | Ready to run / pack |
| **Windows** | [`windows/`](./windows/) + [`desktop/`](./desktop/) | Electron | Ready to run / pack |
| **Android** | [`android/`](./android/) + [`mobile/`](./mobile/) | Capacitor | Scaffold — open in Android Studio |
| **iOS** | [`ios/`](./ios/) + [`mobile/`](./mobile/) | Capacitor | Scaffold — open in Xcode (macOS) |
| Web / API | monorepo root | Express + Vite | Full Stage 2 features |

All platforms share one vault core:

- Quarantine → pattern scan → sanitize → burn original
- **Local + cloud** storage backends
- File **management** (search, rename, folders, tags, backend move)
- File **conversion** (md/html/csv/json/base64/hex/case)
- **20 GB** max · confirm over **5 GB** · burn animation over **1 GB**
