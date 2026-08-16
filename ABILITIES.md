# Burn Box — Abilities & Why It Stands Out

**Product:** Read-only sanitized file vault  
**Version:** Stage 2 complete (v2.0.0)  
**Owner:** LowC / T00l-AID · Powered by Siren Logix

---

## What Burn Box does

Every file you put in is treated as **untrusted fuel**, not a permanent resident.

### Core pipeline
1. **Upload** → lands in **quarantine**
2. **Scan** → pattern/MIME safety analysis
3. **Sanitize** → threat patterns neutralized (or clean copy kept)
4. **Burn** → **original is permanently deleted**
5. **Vault** → only the **safe, read-only copy** remains

Nothing unscanned stays in the drive.

---

## Abilities (Stage 2)

| Ability | Detail |
|---------|--------|
| **Quarantine → burn pipeline** | Original never lives next to safe copies |
| **Pattern safety scanner** | Scripts, RCE patterns, keys, macros, SQL, shell, obfuscation markers |
| **Large-file policy** | Hard max **20 GB** · confirm **>5 GB** · burn animation **>1 GB** · partial scan for huge text |
| **Local + cloud storage** | Disk vault + cloud mirror (S3 / Supabase when configured; offline mirror always) |
| **File management** | Search, rename/display name, folders, tags, move, bulk delete |
| **Conversion (new safe files only)** | MD↔HTML, HTML→text, CSV↔JSON, base64, hex, case transforms |
| **Audit log** | Upload, scan, burn, view, download, delete — full trail |
| **File intelligence notes** | Heuristic type/module detection, imports, URLs, GitHub search hints |
| **Multi-platform shells** | Web, Electron desktop (Win/Linux), Capacitor mobile (Android/iOS) notes |
| **Read-only safe copies** | chmod-style read-only on safe store |
| **Stats** | Safe / blocked / size / threats neutralized / originals burned |

---

## Why it stands out vs similar apps

Most “secure folder” or “file locker” apps:
- **Keep the original** next to a copy
- Encrypt in place and call it safety
- Trust the file once you unlock a password
- Offer cloud sync without a burn step

**Burn Box is different:**

1. **Original is deleted by design**  
   The unsafe object does not remain. Safe copy is the only resident.

2. **Sanitization, not just encryption**  
   Dangerous patterns are stripped or flagged *before* the file is allowed to live in the vault.

3. **Honest scanner**  
   Documented as deterministic pattern/MIME analysis — not fake “AI antivirus” marketing. Room to plug real CDR/AV later.

4. **Built for dirty inbound files**  
   Made for foreign USB dumps, random downloads, lab debris — the same world as PhoenixWrap / Toolaid.

5. **Large-file discipline**  
   Explicit caps, confirm gates, and streaming/partial scan so a 10 GB dump cannot silently wreck the machine.

6. **Convert without mutating the vault resident**  
   Transforms always produce a **new** safe file; the scanned original safe copy stays intact.

7. **Audit-first**  
   Every burn, view, and download is logged — a lab vault, not a black box.

8. **Scope-locked**  
   It is *only* the sanitized drive. Face ID, USB ops, device unlock tools live elsewhere. That focus keeps the product clean.

---

## What it is not

- Not a commercial antivirus replacement
- Not full Content Disarm & Reconstruction (CDR) for PDF/Office yet
- Not FRP / bootloader / partition tooling (other Toolaid projects)
- Not a password cracker

---

## One-line pitch

**Burn Box is a read-only vault that burns the original after scan so only sanitized, audited copies remain — built for lab and inbound-file chaos, not for locking the same dirty file behind a PIN.**
