# Contributing to Burn Box

Thanks for helping. Burn Box stays **scope-locked**: it is only the sanitized read-only vault drive. See [SCOPE.md](SCOPE.md) before adding features.

## Quick start

```bash
git clone https://github.com/xxlowcxx/burn-box-stage-1.git
cd burn-box-stage-1
npm install
npm run dev
```

Open http://localhost:5000

Useful scripts:

| Script | Purpose |
|--------|---------|
| `npm run dev` | Web + API (Vite + Express) |
| `npm run build` | Production client + server bundle |
| `npm run check` | TypeScript check |
| `npm run desktop` | Electron shell (after `desktop:install`) |

## Architecture map

```
client/                 React UI (drive, audit, burn animation)
server/routes.ts        HTTP API (upload, manage, convert, audit)
server/routes-core-*.ts Scan, intel, upload policy, path helpers
server/blob-store.ts    Local + cloud-mirror backends
shared/                 Schema, limits, convert matrix
platforms/              Electron + Capacitor shells
docs/                   Papers + performance notes
```

**Rule:** new scanner / upload-policy logic goes in `routes-core-*`, not back into a monolith `routes.ts`.

## Pull request guidelines

1. **Stay in scope** — vault pipeline, storage, manage, convert, platforms. No device-unlock or recognition suites.
2. **Honesty** — do not market the pattern scanner as commercial AV.
3. **Large files** — respect `shared/limits.ts` (20 GB max / 5 GB confirm / 1 GB ritual).
4. **No secrets** — never commit `data.db`, vault blobs under `storage/*/`, or `.env`.
5. **Typecheck** — `npm run check` should pass.
6. Small, focused PRs beat kitchen-sink dumps.

## Coding notes

- Safe copies are **read-only**; converts always create a **new** safe file.
- Prefer streaming / caps for multi-GB paths (see [docs/PERFORMANCE.md](docs/PERFORMANCE.md)).
- Stage 1 codename “SafeDrive” may appear in historical docs — product name is **Burn Box**.

## License

MIT — by contributing you agree your changes are MIT-licensed.
