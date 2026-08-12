# Stage 2 — Platforms, storage, management, conversion

## Platforms

| Target | Shell | Entry |
|--------|-------|-------|
| Linux | Electron | `platforms/desktop` |
| Windows | Electron | `platforms/desktop` |
| Android | Capacitor | `platforms/mobile` + Android Studio |
| iOS | Capacitor | `platforms/mobile` + Xcode |
| Web | Express + Vite | monorepo root |

## Storage backends

- **local** — `storage/safe`
- **cloud** — `storage/cloud-mirror` always; optional remote via `BURNBOX_S3_*`

Header: `X-Burn-Box-Storage: local|cloud`

## File size policy

- Max: 20 GB (`shared/limits.ts`)
- Confirm header over 5 GB: `X-Burn-Box-Confirm-Large: 1`
- Client animation over 1 GB: fire → snap → shiny box

## Management API

- `GET /api/files?q=&folder=&backend=&status=`
- `PATCH /api/files/:id` — displayName, folder, tags, storageBackend
- `POST /api/files/bulk-delete` — `{ ids: number[] }`
- `POST /api/files/:id/convert` — `{ target }`
- `GET /api/convert/options?name=`
- `GET /api/storage/status`
- `GET /api/limits`

## Conversion

See `shared/convert.ts` for the matrix (md/html/csv/json/base64/hex/case).
Each conversion creates a **new** safe vault file with lineage (`parentFileId`, `convertedFrom`).
