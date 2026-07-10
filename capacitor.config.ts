import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.breixopd.piramidebird",
  appName: "Pirámide de Bird Simulador",
  webDir: "dist",
  backgroundColor: "#07111d",
  android: {
    minWebViewVersion: 107,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#07111d",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    SystemBars: {
      insetsHandling: "css",
    },
  },
};

export default config;
