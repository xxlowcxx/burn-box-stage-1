# Burn Box — Stage 2 Complete

*Working name: Burn Box. Sanitized read-only file vault.*

Burn Box is a **read-only file vault**. Every file you upload is sent to quarantine, run through a safety scanner, rewritten into a sanitized safe copy, and the **original is permanently deleted** — so nothing unscanned ever stays in the drive.

> **Honesty note:** the scanner is a deterministic pattern/regex matcher (plus streaming/MIME checks for large binaries), not a commercial AV engine.

**Stage 2 status: COMPLETE** — see [STATUS.md](STATUS.md) and [ABILITIES.md](ABILITIES.md).

## Why it stands out

Most lockers keep the original. Burn Box **burns** it after scan. Only the safe, audited copy remains.

## Stage 2 features

| Feature | Detail |
|---------|--------|
| **Platforms** | Linux, Windows (Electron), Android + iOS (Capacitor), plus web |
| **Storage** | **Local** disk + **Cloud** (mirror always; remote S3/Supabase when configured) |
| **File management** | Search, rename/display name, folders, tags, backend move, bulk delete |
| **Conversion** | MD↔HTML, HTML→text, CSV↔JSON, base64, hex, case transforms → **new** safe files |
| **Large files** | Max **20 GB** / file · confirm over **5 GB** · burn→snap→shiny animation over **1 GB** |
| **Audit** | Full trail of upload, scan, burn, view, download, delete |

## Run (web / API)

```bash
npm install
npm run dev
```

Default: http://localhost:5000

### Desktop (Windows / Linux)

```bash
npm run desktop:install
npm run desktop
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
| **> 5 GB** | Requires explicit confirm (`X-Burn-Box-Confirm-Large: 1`) |
| **> 1 GB** | Client plays fire → snap → new shiny box, then upload proceeds |
| **> 100 MB** text/binary | Streaming / partial scan — never loads whole file into RAM |

## Project structure

```
client/            React UI (drive, audit, manage, convert, burn animation)
server/            Express: upload, scan, convert, storage backends
shared/            Schema, limits, convert matrix
platforms/         Desktop + mobile shells
storage/           quarantine / safe / cloud-mirror
docs/              Technical paper + performance notes
ABILITIES.md       Product abilities + differentiation
STATUS.md          Completion checklist
SCOPE.md           What is / is not Burn Box
```

## License

MIT — see [LICENSE](LICENSE).
