# Burn Box — Stage 1: SafeDrive

*Working name: Burn Box. This repository is Stage 1 of a planned multi-stage project.*

SafeDrive is a read-only file vault. Every file you upload is sent to quarantine, run through a safety scanner, rewritten into a sanitized "safe copy," and the original is permanently deleted — so nothing unscanned ever stays in the drive.

> **Honesty note:** the scanner in Stage 1 is a deterministic pattern/regex matcher, not a trained AI model or commercial antivirus engine. See [Limitations](docs/stage-1-technical-paper.md#4-limitations-read-before-treating-stage-1-as-production-security) before relying on it for real security decisions.

## What Stage 1 does

1. **Upload** — drag-and-drop or file picker, straight into a quarantine directory.
2. **Scan** — text/code files are checked against a set of threat patterns (script tags, `eval()`, shell commands, SQL injection, macros, etc.). Binary files (images, PDFs) get a MIME/size check. Unknown types get a metadata capsule.
3. **Sanitize & rebuild** — clean files get a scan-report header and are copied through; files with threats have the matched spans redacted before the safe copy is written.
4. **Delete the original** — the quarantined file is deleted the moment the safe copy exists, regardless of outcome.
5. **Lock it down** — every safe copy is written read-only (`chmod 0o444`); there is no edit endpoint in the app.
6. **Audit everything** — every step (upload, scan start, scan complete, original deleted, safe copy created, viewed, downloaded, deleted) is logged and viewable in-app.

## Documentation

- [Stage 1 Technical Paper](docs/stage-1-technical-paper.md) — architecture, threat model, and limitations.
- [Research Bibliography](docs/papers/README.md) — academic sources on content disarm & reconstruction, malware detection, file-upload security, and sandboxing that inform Stage 1 and the roadmap.

## Stack

Express · React + Vite · Tailwind CSS + shadcn/ui · SQLite + Drizzle ORM · Multer

## Running locally

```bash
npm install
npm run dev
```

Starts Express (backend) and Vite (frontend) on the same port (5000 by default).

### Database setup

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

This creates `data.db` (SQLite) with the `files` and `audit_logs` tables. `data.db` and everything under `storage/quarantine/` and `storage/safe/` are gitignored — the vault always starts empty.

### Production build

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

## Project structure

```
client/            React frontend (drive view, audit log, file viewer)
server/            Express backend: upload endpoint, scan pipeline, storage interface
shared/schema.ts   Drizzle schema shared between frontend and backend
storage/quarantine/  Temporary holding area for files awaiting scan (empty in repo)
storage/safe/         Read-only sanitized safe copies (empty in repo)
docs/              Technical paper + research bibliography
```

## Roadmap

Stage 1 is intentionally minimal. Planned next stages (see [technical paper §5](docs/stage-1-technical-paper.md#5-roadmap-stage-2)):

- Real Content Disarm & Reconstruction for images/PDFs (not just a MIME/size check)
- Magic-byte content sniffing instead of trusting declared MIME type
- Isolated sandbox for dynamic analysis
- Evaluation of a real AV engine or ML-based classifier alongside the pattern scanner
- Archive/zip-bomb handling

## License

MIT — see [LICENSE](LICENSE).
