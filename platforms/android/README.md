# Burn Box — Android

Native Android shell via **Capacitor**.

## What you get

- Full Burn Box UI (drive, audit, manage, convert)
- Local + cloud storage modes (cloud hits your configured vault / S3-compatible backend)
- Large-file policy: max **20 GB**, confirm over **5 GB**, burn animation over **1 GB**
- Filesystem plugin ready for on-device vault paths

## Build

Prerequisites: Android Studio, JDK 17+, monorepo `npm install`.

```bash
# 1. Build web assets
cd ../.. && npm run build

# 2. Install mobile deps + add Android project (first time)
cd platforms/mobile
npm install
npx cap add android   # creates platforms/mobile/android

# 3. Sync + open
npx cap sync android
npx cap open android
```

Then **Run** on an emulator or device from Android Studio.

## Pointing at a vault

- **Dev / LAN**: set `server.url` in `platforms/mobile/capacitor.config.ts` to `http://<pc-ip>:5000`
- **Production**: host the API (or reverse proxy) and set the same URL, or ship a sidecar when offline-first lands

## Storage

| Mode | Behavior on Android |
|------|---------------------|
| Local | Safe copies on the vault server's local disk (or device FS via Filesystem plugin in future offline pack) |
| Cloud | Cloud-mirror + optional remote S3/Supabase when env is configured on the vault host |

## Signing

Use your own keystore for Play Store releases (`android/app/build.gradle` signingConfigs).
