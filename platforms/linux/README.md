# Burn Box — Linux

Linux is a **first-class** desktop target via the shared Electron shell.

## Quick start

```bash
# monorepo root
npm install
npm run dev          # web + API on :5000

# desktop shell
cd platforms/desktop
npm install
npm start
```

## Packages

```bash
cd ../.. && npm run build
cd platforms/desktop
npm run pack:linux
```

Outputs (under `platforms/desktop/dist-electron/`):

- `.AppImage` — portable
- `.deb` — Debian/Ubuntu install

## Local + cloud

Same Stage 2 backends as Windows/web. Configure cloud with:

```bash
export BURNBOX_CLOUD_ENABLED=true
export BURNBOX_S3_BUCKET=...
export BURNBOX_S3_ACCESS_KEY=...
export BURNBOX_S3_SECRET_KEY=...
export BURNBOX_S3_ENDPOINT=...   # optional (MinIO / Supabase S3)
```

Without remote credentials, **Cloud** mode still writes to `storage/cloud-mirror/` so the toggle is usable offline.
