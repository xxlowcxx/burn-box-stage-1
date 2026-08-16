# Burn Box

**Sanitized read-only file vault.** Stage 2 complete · v2.0.0 · MIT

Every file you upload lands in **quarantine**, runs through a **safety scanner**, is rewritten into a **sanitized safe copy**, and the **original is permanently deleted**. Nothing unscanned stays in the drive.

> **Honesty note:** the scanner is a deterministic pattern/regex matcher (plus streaming/MIME checks for large binaries), **not** a commercial AV engine. See [SECURITY.md](SECURITY.md) and [docs/stage-1-technical-paper.md](docs/stage-1-technical-paper.md).

**Status:** [STATUS.md](STATUS.md) · **Abilities:** [ABILITIES.md](ABILITIES.md) · **Scope:** [SCOPE.md](SCOPE.md)

## Why it stands out

Most lockers **keep the original**. Burn Box **burns** it after scan. Only the safe, audited copy remains.

## Features (Stage 2)

| Feature | Detail |
|---------|--------|
| **Pipeline** | Quarantine → scan → sanitize → **burn original** → read-only vault |
| **Platforms** | Web · Electron (Windows/Linux) · Capacitor notes (Android/iOS) |
| **Storage** | **Local** disk + **Cloud** mirror (S3/Supabase when configured) |
| **Manage** | Search, display name, folders, tags, backend move, bulk delete |
| **Convert** | MD↔HTML, HTML→text, CSV↔JSON, base64, hex, case → **new** safe files |
| **Large files** | Max **20 GB** · confirm **>5 GB** · burn ritual **>1 GB** |
| **Audit** | Upload, scan, burn, view, download, delete — full trail |

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
| **> 5 GB** | Requires confirm header `X-Burn-Box-Confirm-Large: 1` |
| **> 1 GB** | Client plays fire → snap → new shiny box, then upload |
| **> 100 MB** text | Streaming / partial scan — never loads whole file into RAM |

## Cloud storage

```bash
cp .env.example .env
# set BURNBOX_S3_* or Supabase S3 gateway vars
```

Without remote credentials, **Cloud** still writes under `storage/cloud-mirror/` so both modes work offline.

## Project structure

```
client/            React UI (drive, audit, manage, convert, burn animation)
server/            Express API + routes-core scanner modules
shared/            Schema, limits, convert matrix
platforms/         Desktop + mobile shells
storage/           quarantine / safe / cloud-mirror (contents gitignored)
docs/              Technical paper + performance notes
```

## Docs

| Doc | Purpose |
|-----|---------|
| [ABILITIES.md](ABILITIES.md) | What it does + differentiation |
| [SCOPE.md](SCOPE.md) | What is / is not Burn Box |
| [STATUS.md](STATUS.md) | Completion checklist |
| [SECURITY.md](SECURITY.md) | Limitations + reporting |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Scanner / I/O notes |

## Roadmap (Stage 3)

- Real CDR for images/PDFs
- Resumable chunked uploads
- Optional ClamAV / ML sidecar
- Encrypted-at-rest vault
- Stronger hosted auth (if ever multi-user)

## License

MIT — see [LICENSE](LICENSE).

**T00L-AID · Powered by Siren Logix**
