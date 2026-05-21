import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
