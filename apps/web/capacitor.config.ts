import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor (Android). `webDir` je izlaz `pnpm build:mobile` (`output: "export"`).
 *
 * `androidScheme: "https"` NIJE kozmetika: daje WebView-u origin
 * `https://localhost`, tj. siguran kontekst. Bez toga otpadaju
 * `navigator.clipboard` (kopiranje invite linka), Web Crypto i dio Web Audio
 * ponašanja. Taj origin mora biti u `CORS_ORIGIN` na serveru — inače i REST i
 * socket handshake padaju.
 */
const config: CapacitorConfig = {
  appId: "com.kartaonica.zandar",
  appName: "Žandar",
  webDir: "out",
  android: {
    // Sadržaj je na disku; tijelo aplikacije crta felt do ivica.
    backgroundColor: "#18181b",
  },
  plugins: {
    SplashScreen: {
      // Felt boja iz tokena (--bg / theme_color u manifestu).
      backgroundColor: "#18181b",
      launchShowDuration: 800,
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#18181b",
    },
  },
};

export default config;
