# Changelog

All notable changes to Burn Box are documented here.

## [2.0.0] — 2026-08-16

### Stage 2 — multi-platform vault (feature-complete for intended scope)

#### Added
- Product logo: cartoon CPU-on-fire + Thrasher-style **BURN BOX** wordmark (`docs/brand/`, favicon, Electron icon)
- Local + cloud-mirror storage backends (`server/blob-store.ts`)
- Large-file policy: max **20 GB**, confirm **>5 GB**, burn animation **>1 GB**
- File management: search, display name, folders, tags, backend move, bulk delete
- Conversion matrix → always produces a **new** safe file
- Platform shells: Electron desktop (Win/Linux), Capacitor notes (Android/iOS)
- Routes core split: `routes-core-scan`, `routes-core-intel`, `routes-core-upload`, `routes-core-path`
- Product docs: `ABILITIES.md`, `STATUS.md`, `SCOPE.md`, `docs/PERFORMANCE.md`
- Public polish: `SECURITY.md`, `CONTRIBUTING.md`, this changelog

#### Changed
- Branding: **SafeDrive** UI codename → **Burn Box**
- Upload path uses core scanner (performance-tuned, Set lookups, single-pass sanitize)
- View endpoint caps in-memory body (2 MB) with truncate notice for huge files
- Version `package.json` → `2.0.0`

#### Honest limits (unchanged policy)
- Scanner remains pattern/MIME based — not ClamAV/ML
- Mobile offline vault and resumable uploads deferred to Stage 3

## [1.x] — Stage 1

- Quarantine → pattern scan → sanitize → delete original → audit log
- Web UI drive + audit
- SQLite metadata, read-only safe copies
