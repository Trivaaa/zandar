import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Live reload (`pnpm dev:android`): WebView ucitava `next dev` sa LAN adrese
 * umjesto `out/`-a sa diska. Gated env varijablom, pa izvor configa ostaje
 * isti i za izdanje — nista se ne komentarise i ne vraca rucno.
 *
 * `cleartext` je nuzan jer je dev server na `http://`, a Android od API 28
 * blokira cleartext. Capacitor tu zastavicu upisuje u GENERISANI
 * `capacitor-cordova-android-plugins` manifest (nije u gitu), ne u
 * `app/src/main/AndroidManifest.xml` — pa izdanje ostaje bez nje cim se odradi
 * obican `pnpm cap:sync`.
 */
const liveReloadUrl = process.env.CAP_LIVE_RELOAD_URL;

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
  // `build-apk.mjs` builda u jedinstven folder (vidi next.config.ts) da
  // zaobiđe Windows EBUSY na starom zaključanom `out/`; ista varijabla mora
  // ovdje da `cap sync` pokupi pravi izvor.
  webDir: process.env.MOBILE_DIST_DIR || "out",
  ...(liveReloadUrl
    ? { server: { url: liveReloadUrl, cleartext: true } }
    : {}),
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
