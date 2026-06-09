import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaManager } from "@/components/PwaManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Žandar — igraj sa prijateljima online",
  description:
    "Tradicionalna kartaška igra. Pozovi 1–3 prijatelja preko linka i odigraj partiju u browseru.",
  openGraph: {
    title: "Žandar online",
    description: "Pozovi prijatelje i odigraj partiju Žandara",
    images: ["/og-image.png"],
    type: "website",
    locale: "bs_BA",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Žandar",
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
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
