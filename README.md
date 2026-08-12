# Burn Box — Stage 2 (multi-platform vault)

*Working name: Burn Box. Stage 1 pipeline + Stage 2 platforms, storage, management, conversion, large files.*

Burn Box is a **read-only file vault**. Every file you upload is sent to quarantine, run through a safety scanner, rewritten into a sanitized safe copy, and the **original is permanently deleted** — so nothing unscanned ever stays in the drive.

> **Honesty note:** the scanner is still a deterministic pattern/regex matcher (plus streaming/MIME checks for large binaries), not a commercial AV engine. See [docs/stage-1-technical-paper.md](docs/stage-1-technical-paper.md).

## Stage 2 highlights

| Feature | Detail |
|---------|--------|
| **Platforms** | Linux, Windows (Electron), Android + iOS (Capacitor), plus web |
| **Storage** | **Local** disk + **Cloud** (mirror always; remote S3/Supabase when configured) |
| **File management** | Search, rename/display name, folders, tags, backend move, bulk delete |
| **Conversion** | MD↔HTML, HTML→text, CSV↔JSON, base64, hex, case transforms → **new** safe files |
| **Large files** | Max **20 GB** / file · confirm over **5 GB** · burn→snap→shiny animation over **1 GB** |

### Was file management / conversion already there?

**No (Stage 1).** Stage 1 was list / view / download / delete + audit.  
**Yes now (Stage 2):** manage + convert APIs and UI are included.

## Platforms

See [`platforms/README.md`](platforms/README.md).

```
platforms/
  desktop/     Electron — Windows + Linux
  windows/     Windows notes
  linux/       Linux notes
  mobile/      Capacitor shared config
  android/     Android build notes
  ios/         iOS build notes
```

## Run (web / API)

```bash
npm install
npm run dev
```

Default: http://localhost:5000

### Desktop (Windows / Linux)

```bash
npm run desktop:install
npm run desktop          # spawns vault + Electron window
```

### Mobile (Android / iOS)

```bash
npm run build
npm run mobile:install
cd platforms/mobile && npx cap add android   # or ios on macOS
npm run mobile:sync
npx cap open android   # or ios
```

## Large-file policy

| Threshold | Behavior |
|-----------|----------|
| **> 20 GB** | Rejected (HTTP 413) |
| **> 5 GB** | Requires explicit confirm (`X-Burn-Box-Confirm-Large: 1`) — stops runaway watchers |
| **> 1 GB** | Client plays fire → snap → new shiny box, then upload proceeds |
| **> 100 MB** text/binary | Streaming / partial scan — never loads whole file into RAM |

## Cloud storage

```bash
cp .env.example .env
# set BURNBOX_S3_* or SUPABASE S3 gateway vars
```

Without remote credentials, **Cloud** still writes under `storage/cloud-mirror/` so both modes work offline.

## Project structure

```
client/            React UI (drive, audit, manage, convert, burn animation)
server/            Express: upload, scan, convert, storage backends
shared/            Schema, limits, convert matrix
platforms/         Desktop + mobile shells
storage/           quarantine / safe / cloud-mirror (gitignored contents)
docs/              Technical paper + bibliography
```

## Roadmap (next)

- Real CDR for images/PDFs, magic-byte sniffing
- Resumable chunked uploads for multi-GB mobile
- On-device offline vault for iOS/Android (Filesystem)
- Optional ClamAV / ML classifier sidecar
- Background transfer + progress UI for huge files

## Ideas to make it better

- Resumable uploads (tus) + pause/resume
- Encrypted vault (age/libsodium) at rest
- Folder sharing / device pairing QR
- Automatic format packs (LibreOffice headless, ffmpeg) for rich convert
- Watch folders with **opt-in** size caps (never silent multi-GB)
- Threat timeline + exportable compliance reports
- Passkey lock on the vault

## License

MIT — see [LICENSE](LICENSE).
