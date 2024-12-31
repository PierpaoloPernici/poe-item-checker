import type { Metadata, Viewport } from "next";
import { GeistSans, GeistMono } from "geist/font";
import "./globals.css";

export const metadata: Metadata = {
  title: "PoE2 Italia Item Checker | Path of Exile 2",
  description: "Controlla subito i prezzi degli item di Path of Exile 2. Confronta i prezzi sul sito ufficiale con un solo click. Gratuito, veloce e preciso!",
  keywords: "Path of Exile 2, PoE2, item price checker, PoE trade, item pricing tool, Path of Exile trading",
  authors: [{ name: "PieR" }],
  metadataBase: new URL('https://poe2.pcube.io'),
  openGraph: {
    title: "PoE2 Italia Item Checker | Path of Exile 2",
    description: "Controlla subito i prezzi degli item di Path of Exile 2. Confronta i prezzi sul sito ufficiale con un solo click. Gratuito, veloce e preciso!",
    type: "website",
    locale: "it_IT",
    siteName: "PoE2 Italia Item Checker"
  },
  twitter: {
    card: "summary_large_image",
    title: "PoE2 Italia Item Checker | Path of Exile 2",
    description: "Controlla subito i prezzi degli item di Path of Exile 2. Confronta i prezzi sul sito ufficiale con un solo click. Gratuito, veloce e preciso!"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large'
    }
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0f17"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
