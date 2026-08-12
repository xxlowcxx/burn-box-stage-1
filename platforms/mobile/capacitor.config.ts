import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Shared Capacitor config for Burn Box iOS + Android.
 * Web assets are the Vite production build at ../../dist/public.
 *
 * Local vault: point server.url at a machine on your LAN running Burn Box,
 * or use the bundled offline mode when native local server is available.
 */
const config: CapacitorConfig = {
  appId: "com.toolaid.burnbox",
  appName: "Burn Box",
  webDir: "../../dist/public",
  server: {
    // Uncomment for live reload against a dev machine:
    // url: "http://YOUR_LAN_IP:5000",
    // cleartext: true,
    androidScheme: "https",
    iosScheme: "https",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
