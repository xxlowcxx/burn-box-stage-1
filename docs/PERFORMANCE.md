# Burn Box — Performance Notes

Last updated: 2026-08-16

## Optimizations applied

### Scanner (`server/routes-core-scan.ts`)
- **Single-pass threat detection**: `replace` callback counts hits and sanitizes in one pass (no separate `match` then `replace`).
- **TEXT_EXTENSIONS → Set**: O(1) extension checks instead of array `.includes`.
- **Clean text files**: prefer `copyFileSync` when no sanitization needed (avoid rewriting full body).
- **Large text (>100 MB)**: still scans first 500 KB only, then stream-copies; never loads whole file into RAM.
- **Unknown binaries**: metadata capsule only — no expensive full binary copy into safe vault.

### Upload / I/O path
- Binary-safe media (image/audio/video/pdf): MIME check + copy only.
- `blob-store.ts` already uses streaming `copyFileStreaming` for safe/cloud puts — keep using that for multi-GB paths.
- View/download should stream from disk rather than `readFileSync` of entire safe copies when serving large files.

### Limits (`shared/limits.ts`)
- Hard cap 20 GB, confirm >5 GB, animation >1 GB — unchanged policy; ensure multer / body limits match this on the live upload route.

## Recommended next steps
1. Align any remaining upload route (e.g. legacy `routes.ts` multer 25 MB) with `MAX_FILE_BYTES` (20 GB).
2. Make intelligence analysis optional / async so it never blocks the critical quarantine → safe path.
3. Stream `/api/files/:id/view` and download for large safe copies.
4. Consider worker thread for regex scan on multi-MB text to keep the event loop free under concurrent uploads.
