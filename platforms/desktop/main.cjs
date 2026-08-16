/**
 * Burn Box — Electron shell for Windows and Linux.
 * Spawns the local Node vault server and loads the UI.
 */
const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const PORT = process.env.PORT || "5000";
const isDev = !app.isPackaged;

let mainWindow = null;
let serverProc = null;

function serverRoot() {
  if (isDev) {
    return path.resolve(__dirname, "..", "..");
  }
  return path.join(process.resourcesPath, "burn-box-server");
}

function startServer() {
  const cwd = serverRoot();
  const env = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: isDev ? "development" : "production",
    BURNBOX_DESKTOP: "1",
  };

  if (isDev) {
    serverProc = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["tsx", "server/index.ts"],
      { cwd, env, stdio: "inherit", shell: process.platform === "win32" },
    );
  } else {
    const entry = path.join(cwd, "index.cjs");
    serverProc = spawn(process.execPath, [entry], {
      cwd,
      env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: "inherit",
    });
  }

  serverProc.on("exit", (code) => {
    console.log("[burn-box] server exited", code);
  });
}

function waitForServer(maxMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(`http://127.0.0.1:${PORT}/api/limits`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else if (Date.now() - start > maxMs) reject(new Error("Server timeout"));
        else setTimeout(tryOnce, 400);
      });
      req.on("error", () => {
        if (Date.now() - start > maxMs) reject(new Error("Server timeout"));
        else setTimeout(tryOnce, 400);
      });
    };
    tryOnce();
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "Burn Box",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  try {
    await waitForServer();
    await mainWindow.loadURL(`http://127.0.0.1:${PORT}/`);
  } catch (err) {
    dialog.showErrorBox(
      "Burn Box failed to start",
      String(err?.message || err) +
        "\n\nMake sure dependencies are installed at the monorepo root (`npm install`) and try again.",
    );
    app.quit();
  }
}

app.whenReady().then(async () => {
  startServer();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (serverProc && !serverProc.killed) {
    try { serverProc.kill(); } catch { /* ignore */ }
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProc && !serverProc.killed) {
    try { serverProc.kill(); } catch { /* ignore */ }
  }
});
