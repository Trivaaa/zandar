import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

/**
 * Dva build oblika iz JEDNE konfiguracije (docs/MOBILE_PLAN_STATUS.md):
 *
 *   web (default)             → Vercel, server build, path rute + redirects
 *   mobile (BUILD_TARGET=…)   → `output: "export"` za Capacitor WebView
 *
 * Mehanizam je `pageExtensions`. `page.web.tsx` je ruta SAMO u web buildu; u
 * mobilnom Next taj fajl ne vidi, pa `[roomId]` folder ostaje bez `page` fajla
 * → nema dinamičkog segmenta → `output: "export"` prolazi bez
 * `generateStaticParams` (roomId se ne zna unaprijed). In-app navigacija ide na
 * query oblik `/room?id=` (`lib/routes.ts`), koji radi i bez path routinga.
 */
const isMobile = process.env.BUILD_TARGET === "mobile";

const nextConfig: NextConfig = {
  // Testiranje sa telefona na LAN adresi: Next 16 po defaultu blokira
  // cross-origin pristup dev resursima (error overlay, HMR), pa se greska na
  // uredjaju ne moze procitati. Vazi SAMO u dev-u; postavi NEXT_DEV_ORIGIN na
  // IP svog PC-a (npr. 192.168.100.184) prije `pnpm dev`.
  ...(process.env.NEXT_DEV_ORIGIN
    ? { allowedDevOrigins: [process.env.NEXT_DEV_ORIGIN] }
    : {}),

  // Duži oblik mora ići PRVI — Next skida ekstenziju prvom koja se poklopi, pa
  // bi "tsx" od `page.web.tsx` napravio rutu `page.web` (tj. ništa).
  pageExtensions: isMobile
    ? ["tsx", "ts", "jsx", "js"]
    : ["web.tsx", "tsx", "ts", "jsx", "js"],

  ...(isMobile
    ? {
        output: "export" as const,
        // Capacitor servira sa diska: `/room/` → `out/room/index.html` radi,
        // golo `/room` → `room.html` ne.
        trailingSlash: true,
        // next/image se nigdje ne koristi; ovo je samo da optimizator ne
        // obori export ako neko sutra doda <Image>.
        images: { unoptimized: true },
      }
    : {
        // /zandar/room/:roomId → /room/:roomId (308 trajni redirect; zadrži oba
        // linka). Ne postoji u exportu — `redirects()` je tamo no-op.
        async redirects() {
          return [
            {
              source: "/zandar/room/:roomId",
              destination: "/room/:roomId",
              permanent: true,
            },
          ];
        },
      }),
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "tricom",

  project: "zandar-web",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  }
});
