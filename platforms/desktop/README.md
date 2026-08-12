# Burn Box Desktop (Windows + Linux)

Electron shell that runs the local Burn Box vault server and opens the UI.

## Features (same core as web)

- Local + cloud storage backends
- Up to **20 GB** per file (confirm over 5 GB)
- Burn animation for drops over 1 GB
- File management (rename, folder, tags, backend move)
- File conversion matrix
- Quarantine → scan → burn original → safe copy

## Develop

From monorepo root:

```bash
npm install
cd platforms/desktop && npm install
# terminal 1 (optional if electron starts server itself in dev)
cd ../.. && npm run dev
# terminal 2
cd platforms/desktop && npm start
```

`main.cjs` will spawn `npx tsx server/index.ts` from the monorepo root in development.

## Package

```bash
# build server + client first
cd ../.. && npm run build

cd platforms/desktop
npm run pack:linux   # AppImage + deb
npm run pack:win     # NSIS + portable (build on Windows or with wine)
```

## Platform notes

| OS | Artifact |
|----|----------|
| Linux | AppImage, `.deb` |
| Windows | NSIS installer, portable `.exe` |

macOS is not a target in this Stage 2 pack (can be enabled later).
