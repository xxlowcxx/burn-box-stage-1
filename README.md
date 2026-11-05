# Burn Box

A read-only vault. Every upload is quarantined, scanned, rewritten into a safe copy, and the original is deleted.

| | |
| --- | --- |
| What it is | Stage 1 and stage 2 of that vault. Pattern scanner, not a commercial antivirus. |
| What it is not | Phoenix. Phoenix keeps the original. Burn Box deletes it on purpose. |
| Status | The program below is the current body. The mission is to finish stage 3 and repush. |
| Owner | LowC. Toolaid. Powered by Siren Logix. |

## Mission

Repush the code and complete the roadmap at the bottom of this page. Do not change the burn rule into Phoenix's keep-the-original rule.

---

**Sanitized read-only file vault.** Stage 2 complete. v2.0.0. MIT.

The scanner is a deterministic pattern and regex matcher, plus streaming and MIME checks for large binaries. It is not a commercial AV engine. See SECURITY.md and docs/stage-1-technical-paper.md.

Status, abilities, and scope: STATUS.md, ABILITIES.md, SCOPE.md.

## Run

```bash
npm install
npm run dev
```

Default: http://localhost:5000

Desktop: `npm run desktop:install` then `npm run desktop`.

## Where the rest of the docs are

| Doc | Purpose |
| --- | --- |
| ABILITIES.md | What it does |
| SCOPE.md | What is and is not Burn Box |
| STATUS.md | Completion checklist |
| SECURITY.md | Limits |
| CONTRIBUTING.md | How to contribute |
| CHANGELOG.md | Releases |

Stage 3 is still open: real content disarm for images and PDFs, resumable uploads, an optional scanner sidecar, encryption at rest, and stronger auth if it is ever multi-user.
