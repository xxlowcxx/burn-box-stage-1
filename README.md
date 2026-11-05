# Burn Box

A read-only vault. Every upload is quarantined, scanned, rewritten into a safe copy, and the original is deleted.

| | |
| --- | --- |
| What it is | Stage 1 and stage 2 of that vault. Pattern scanner, not a commercial antivirus. |
| What it is not | Phoenix. Phoenix keeps the original. Burn Box deletes it on purpose. |
| Status | The program below is the current body. Stage 3 is still open. |
| Owner | LowC. Toolaid. Powered by Siren Logix. |

## Mission

Repush the code and finish stage 3. Do not change the burn rule into Phoenix's keep-the-original rule.

---

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
cd platforms/mobile && npx cap add android
npm run mobile:sync
npx cap open android
```

## Large-file policy

| Threshold | Behavior |
|-----------|----------|
| **> 20 GB** | Rejected (HTTP 413) |
| **> 5 GB** | Requires confirm header `X-Burn-Box-Confirm-Large: 1` |
| **> 1 GB** | Client plays the burn animation, then upload |
| **> 100 MB** text | Streaming / partial scan |

## Cloud storage

```bash
cp .env.example .env
```

Set `BURNBOX_S3_*` or the Supabase S3 gateway vars. Without remote credentials, Cloud still writes under `storage/cloud-mirror/`.

## Project structure

```
client/            React UI
server/            Express API + scanner modules
shared/            Schema, limits, convert matrix
platforms/         Desktop + mobile shells
storage/           quarantine / safe / cloud-mirror (gitignored)
docs/              Technical paper + performance notes
```

## Docs

| Doc | Purpose |
|-----|---------|
| [ABILITIES.md](ABILITIES.md) | What it does |
| [SCOPE.md](SCOPE.md) | What is / is not Burn Box |
| [STATUS.md](STATUS.md) | Completion checklist |
| [SECURITY.md](SECURITY.md) | Limitations |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Scanner / I/O notes |

## Roadmap (Stage 3)

- Real content disarm for images and PDFs
- Resumable chunked uploads
- Optional scanner sidecar
- Encrypted-at-rest vault
- Stronger hosted auth if it is ever multi-user

## License

MIT. See [LICENSE](LICENSE).
