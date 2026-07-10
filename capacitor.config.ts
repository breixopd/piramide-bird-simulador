import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.breixopd.piramidebird",
  appName: "Pirámide de Bird Simulador",
  webDir: "dist",
  backgroundColor: "#f7f5f0",
  android: {
    minWebViewVersion: 107,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#f7f5f0",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    SystemBars: {
      insetsHandling: "css",
    },
  },
};

export default config;
