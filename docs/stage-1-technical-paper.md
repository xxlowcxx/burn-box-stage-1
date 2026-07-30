# Burn Box — Stage 1 Technical Paper

**Subtitle:** SafeDrive: a read-only file vault with pattern-based safety scanning
**Status:** Prototype (Stage 1 of a multi-stage roadmap)
**Date:** July 2026

## Abstract

Burn Box is a multi-stage project exploring "scan, disarm, and rebuild" as an alternative to trust-on-upload file storage. Stage 1, codenamed SafeDrive, implements the minimum end-to-end pipeline: a file is uploaded to quarantine, scanned against a static set of threat patterns, rewritten into a sanitized read-only "safe copy," and the original is permanently deleted. This paper describes the Stage 1 architecture, its threat model, what it does and does not protect against, and the roadmap to close the gap with real content-disarm-and-reconstruction (CDR) and ML-based detection systems described in the accompanying [research bibliography](papers/README.md).

## 1. Motivation

Most consumer and small-team file storage tools trust files at rest: whatever is uploaded is what gets served back, byte-for-byte, indefinitely. That means any latent threat in a file — a macro, an embedded script, a disguised executable — persists in storage and travels with every future download. Burn Box's premise is that a drive should never store an unexamined, unmodified original. Stage 1 tests the simplest version of that idea: irreversibly replace every upload with a scanned, sanitized, read-only artifact.

## 2. Stage 1 Architecture

```
Upload (multipart/form-data)
   │
   ▼
Quarantine directory (storage/quarantine/)
   │
   ▼
performAIScan(filePath, originalName, mimeType, fileSize)
   │
   ├─ Text/code files  → read content → match against THREAT_PATTERNS
   │                      → clean: wrap in scan-report header, write to storage/safe/
   │                      → threats found: redact matched spans, write sanitized copy
   │
   ├─ Binary "safe" media (image/*, application/pdf) → size check → copy as-is to storage/safe/
   │     (Stage 1 limitation: no pixel/stream-level inspection — see §4)
   │
   └─ Unknown MIME type → write a metadata capsule (name, size, type, timestamp)
         to storage/safe/, original is not retained in any form
   │
   ▼
chmod 0o444 on every file written to storage/safe/ (read-only at the filesystem layer)
   │
   ▼
Delete original from storage/quarantine/
   │
   ▼
Audit log entry per step (upload, scan_start, scan_complete, original_deleted,
safe_copy_created, viewed, downloaded)
```

### 2.1 Threat pattern matching

`THREAT_PATTERNS` is a fixed array of regular expressions covering: `<script>` tags, `eval()`/`Function()` constructors, shell metacharacters and common destructive commands (e.g. `rm -rf`), SQL injection idioms, Office macro markers, and a handful of known-suspicious string literals (e.g. cookie/credential exfiltration phrases). Matches are counted, logged as "threats," and — for text files — replaced with `[REMOVED BY SCANNER]` before the safe copy is written.

This is static string/regex matching, not semantic or behavioral analysis. It has zero false-negative guarantee against obfuscated or encoded payloads (base64, string concatenation, homoglyphs) and zero protection against payloads that never appear as plain text.

### 2.2 Data model

Two tables (SQLite via Drizzle ORM):

- `files` — id, originalName, safeName, mimeType, fileSize, safeSize, scanStatus (`scanning`/`safe`/`blocked`), scanSummary, threatsDetected (JSON array), safeCopyPath, createdAt, scannedAt.
- `auditLogs` — id, fileId, action, detail, timestamp.

### 2.3 Read-only enforcement

Read-only is enforced at two layers: (1) the UI never exposes an edit affordance, and (2) safe copies are written with filesystem mode `0o444` after creation. There is no application-layer write endpoint for existing safe copies — the only mutation paths are create (upload) and delete (explicit user delete action, logged).

## 3. Threat Model

**In scope for Stage 1:**
- Plain-text payloads containing recognizable script/shell/SQL/macro syntax uploaded as `.txt`, `.js`, `.py`, `.sh`, `.sql`, `.html`, etc.
- Accidental persistence of an unscanned original — Stage 1 guarantees the original is deleted after every scan outcome (safe or blocked).
- Tampering with a stored file after upload — filesystem permissions block in-place edits.

**Explicitly out of scope for Stage 1 (see Limitations):**
- Obfuscated, encoded, compressed, or polyglot payloads.
- Malicious content embedded in binary formats (image steganography, malformed PDF objects, polyglot files) — Stage 1 does no byte-level parsing of binaries.
- Executable/compiled malware (PE/ELF binaries, shellcode).
- Anything requiring dynamic/behavioral analysis (a payload that only activates at runtime).
- Multi-file or cross-file attacks (e.g., a zip bomb, or a script split across two "safe" files).

## 4. Limitations (read before treating Stage 1 as production security)

1. **Not a real anti-malware engine.** Stage 1 is a deterministic pattern scanner, not a machine-learning or signature-database-backed antivirus. Compare to the AI/ML malware detection literature in the [bibliography](papers/README.md#aiml-based-malware-detection-context-for-future-stages) — none of those techniques are implemented here yet.
2. **Binary files are not disarmed.** Images and PDFs are copied through after a MIME-type and size check only. Real CDR for images (per Belkind, Dubin & Dvir, 2023, and Jung et al.'s ImageDetox, 2020 — both in the bibliography) would extract and rebuild pixel data to strip hidden payloads; Stage 1 does not do this yet.
3. **No sandboxing or dynamic analysis.** The "quarantine" directory is a plain temp folder, not an isolated execution environment. Files are never executed or observed at runtime, so anti-dynamic-analysis and sandbox-evasion techniques documented in the sandboxing literature are moot here simply because Stage 1 never attempts dynamic analysis in the first place.
4. **MIME-type branching is spoofable.** The scan path (text vs. binary vs. unknown) is chosen using the client-reported/detected MIME type, which is not authoritative — see the MIME-ambiguity evasion research cited in the bibliography. Stage 2 should sniff magic bytes rather than trusting MIME type alone.
5. **Single-file scope.** No protection against threats that only manifest across multiple files or on extraction (archives, zip bombs).

**Because of the above, all product copy in Stage 1 uses "pattern scan" / "safety scan" language rather than claiming AI-verified or malware-proof security.**

## 5. Roadmap (Stage 2+)

- Replace binary passthrough with real image/PDF Content Disarm & Reconstruction.
- Add magic-byte/content-sniffing MIME detection instead of trusting declared MIME type.
- Introduce a real isolated execution sandbox for dynamic analysis of executable-adjacent uploads.
- Evaluate integrating an open-source AV engine (e.g., ClamAV) or a hosted scanning API alongside the pattern scanner.
- Explore an ML classifier trained on the datasets/techniques surveyed in the bibliography, with explicit adversarial-robustness testing before any detection claim is upgraded from "pattern scan" to "AI-detected."
- Archive/zip-bomb and multi-file attack handling.

## 6. Stack

Express (Node.js) · React + Vite · Tailwind CSS + shadcn/ui · SQLite + Drizzle ORM · Multer for uploads.

## References

See [docs/papers/README.md](papers/README.md) for the full annotated bibliography with links.
