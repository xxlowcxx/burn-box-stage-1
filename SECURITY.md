# Security Policy

## What Burn Box is

Burn Box is a **lab / personal vault** that quarantines inbound files, runs a **deterministic pattern + MIME scan**, writes a sanitized read-only safe copy, and **deletes the original**.

It is **not** a commercial antivirus, EDR, or full Content Disarm & Reconstruction (CDR) product.

## Honest limitations

| Claim people might assume | Reality |
|---------------------------|---------|
| “AI antivirus” | Pattern/regex + MIME heuristics only (see scanner honesty notes in README) |
| Stops all malware | No — polymorphic binaries, novel macros, and packed PE/ELF are not fully analyzed |
| Safe to open everything it marks “safe” | **No.** “Safe” means “passed this scanner”; still treat downloads as untrusted for execution |
| Encrypted vault | Optional future work — Stage 2 does not encrypt at rest by default |
| Multi-tenant SaaS hardening | Single-operator local vault; bind carefully if you expose the port |

## Reporting vulnerabilities

If you find a security issue in Burn Box:

1. **Do not** open a public issue with exploit details for critical bugs.
2. Prefer contacting the maintainer via GitHub security advisory on this repo, or privately via the owner’s GitHub profile (`@xxlowcxx`).
3. Include: version/commit, steps to reproduce, impact, and any suggested fix.

We appreciate responsible disclosure. Expect a best-effort response — this is an independent open project.

## Hardening recommendations for operators

- Run on a trusted machine; do not expose `:5000` to the public internet without reverse-proxy auth + TLS.
- Keep vault storage (`storage/`, `data.db`) on an encrypted disk volume if the host is shared.
- Treat **Execute / download** of safe copies as *your* risk decision — the UI already warns for runnable types.
- Rotate any cloud keys in `.env` (`BURNBOX_S3_*`) if leaked; never commit `.env`.
- Prefer Local backend for highly sensitive lab dumps unless cloud credentials are locked down.

## Out of scope

Bypassing phone locks, FRP, bootloader, Find My, or any device-unlock tooling is **not** this product (see [SCOPE.md](SCOPE.md)).
