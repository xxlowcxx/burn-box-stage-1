# Burn Box — iOS

Native iOS shell via **Capacitor**.

## What you get

- Full Burn Box UI (drive, audit, manage, convert)
- Local + cloud storage modes
- Large-file policy: max **20 GB**, confirm over **5 GB**, burn animation over **1 GB**
- Ready for App Store packaging with your Apple Developer team

## Build

Prerequisites: macOS, Xcode 15+, CocoaPods, monorepo `npm install`.

```bash
# 1. Build web assets
cd ../.. && npm run build

# 2. Install mobile deps + add iOS project (first time, on macOS)
cd platforms/mobile
npm install
npx cap add ios

# 3. Sync + open
npx cap sync ios
npx cap open ios
```

Select a simulator or device in Xcode and Run.

## Pointing at a vault

- **Dev**: set `server.url` in `platforms/mobile/capacitor.config.ts` to your Mac's LAN URL (`http://192.168.x.x:5000`) and enable ATS exceptions for cleartext if needed
- **Production**: HTTPS vault endpoint

## Storage

| Mode | Behavior on iOS |
|------|-----------------|
| Local | Vault host local disk (or future on-device container via Filesystem) |
| Cloud | Cloud-mirror + optional remote object storage when vault is configured |

## Notes

- Large uploads may need background URLSession work for multi-GB reliability (roadmap)
- Confirm dialogs over 5 GB still apply so watchers cannot unbounded-upload
