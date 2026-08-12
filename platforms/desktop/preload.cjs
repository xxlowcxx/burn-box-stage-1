const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("burnBoxDesktop", {
  platform: process.platform, // win32 | linux | darwin
  isDesktop: true,
  version: "2.0.0",
});
