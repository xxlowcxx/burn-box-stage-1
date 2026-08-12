# Burn Box — Windows

Windows is a **first-class** desktop target via the shared Electron shell.

## Quick start

```powershell
# monorepo root
npm install
npm run dev

cd platforms\desktop
npm install
npm start
```

## Packages

Build the production bundle, then:

```powershell
cd platforms\desktop
npm run pack:win
```

Outputs:

- NSIS installer
- Portable `.exe`

## Local + cloud

Identical policy to Linux:

- **Local** → `storage/safe`
- **Cloud** → `storage/cloud-mirror` (+ remote when S3 env is set)

## Large files

- Max **20 GB** per file
- Confirm prompt over **5 GB**
- Fire → snap → shiny box animation over **1 GB**
