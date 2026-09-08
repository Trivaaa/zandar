import type { MetadataRoute } from "next";

/**
 * PWA manifest (DS §9 D1). Generiše /manifest.webmanifest.
 * Ikone su renderovane brand "Ž" na feltu (public/icon-*.png).
 */
/**
 * Manifest se kompajlira u route handler (`/manifest.webmanifest`), a
 * `output: "export"` traži da svaki handler eksplicitno kaže da je statičan.
 * Sadržaj ovdje ne zavisi od request-a, pa force-static važi i za web build.
 */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tablić - Žandar",
    short_name: "Žandar",
    description:
      "Klasična kartaška — sad i online. Nađi sto ili pozovi prijatelje.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#18181b",
    theme_color: "#18181b",
    lang: "bs",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
