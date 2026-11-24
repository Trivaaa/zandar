import type { Metadata, Viewport } from "next";
import { Archivo_Black, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { PwaManager } from "@/components/PwaManager";
import { NativeShell } from "@/components/NativeShell";
import { MetaConsentPrompt } from "@/components/MetaConsent";
import { NativePush } from "@/components/NativePush";
import { AuthBoot } from "@/components/AuthBoot";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

// latin-ext je OBAVEZAN — č ć ž š đ žive tamo. Bez njega dijakritika
// pada na sistemski font i tekst se vidljivo miješa usred riječi.
const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400", // jedina težina; 400 je već black
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "600", "700"], // body / semibold (19×) / bold (99×)
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kartaonica — kartaške igre online sa prijateljima",
  description:
    "Klasične kartaške igre online. Sjedi za sto odmah ili pozovi prijatelje preko linka — besplatno, u pregledaču ili u aplikaciji.",
  openGraph: {
    title: "Kartaonica — Žandar, Raub, Poker",
    description:
      "Ko je za jednu? Pozovi prijatelje i igraj online — besplatno, bez instalacije.",
    // Novo ime fajla namjerno: WhatsApp/Facebook keširaju preview po URL-u slike.
    // JPEG < 300 KB — WhatsApp ne prikazuje preview za velike slike.
    images: [
      {
        url: "/og-share.jpg",
        width: 1200,
        height: 630,
        alt: "Ko je za jednu? Žandar, Raub, Poker",
      },
    ],
    type: "website",
    locale: "bs_BA",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kartaonica",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
};

// viewport-fit=cover — notch/home-indicator safe areas (DS §6, §1.5)
export const viewport: Viewport = {
  themeColor: "#18181b",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bs"
      className={`${archivoBlack.variable} ${plexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaManager />
        <NativeShell />
        <MetaConsentPrompt />
        <NativePush />
        <AuthBoot />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
