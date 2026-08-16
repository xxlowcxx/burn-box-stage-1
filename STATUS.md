# Burn Box Status

**Stage 2: COMPLETE** (feature-complete vault for intended scope)  
**Date marked:** 2026-08-16  
**Version:** 2.0.0

## Complete means

- [x] Quarantine → scan → sanitize → delete original → safe store
- [x] Audit log + stats
- [x] Large-file policy (20 GB / 5 GB confirm / 1 GB ritual)
- [x] Local + cloud-mirror storage backends
- [x] File management + conversion matrix
- [x] Multi-platform shell structure (web + Electron + Capacitor notes)
- [x] Performance pass on scanner (single-pass patterns, Set lookups, large-file path)
- [x] ABILITIES.md product definition
- [x] SCOPE.md boundary clear

## Known debt (not blockers for Stage 2)

- `server/routes.ts` still carries a legacy inlined scanner path; optimized logic lives in `routes-core-scan.ts` — prefer core path for new work
- Scanner is pattern/MIME based, not ClamAV/ML
- No resumable tus uploads yet
- Mobile on-device offline vault not fully wired

## Next (Stage 3 ideas)

- Real CDR for images/PDFs
- Resumable chunked uploads
- Optional ClamAV / ML sidecar
- Encrypted-at-rest vault option
- Unify all routes on `routes-core-*` only
