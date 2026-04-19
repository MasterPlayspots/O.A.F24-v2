import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/cookie-banner/CookieBanner";
import { ConsentGatedAnalytics } from "@/components/analytics/ConsentGatedAnalytics";

/*
 * Sovereign Trust — type stack for governance AI
 *
 *   Source Serif 4 — display & editorial
 *     Variable axis (200–900, 8pt–60pt optical sizing). Adobe's modern
 *     companion to Source Sans. It sits in the same tonal register as
 *     Freight Text or Whitney Serif without the licensing cost. Reads
 *     serious without feeling antiquated. Money figures are serif.
 *
 *   Inter — body & UI
 *     Stays. Battle-tested. Inter + Source Serif 4 is a canonical
 *     institutional pairing (used by the Financial Times site, Foreign
 *     Affairs, many regtech platforms).
 *
 *   JetBrains Mono — legal references, program IDs, Aktenzeichen
 *     Technical precision. Used for anything that reads like a citation:
 *     "BAFA-Förderrichtlinie vom 11.08.2023", "KfW 067", "§ 14 UStG".
 */
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fund24.io"),
  title: {
    default: "fund24 — Fördermittel verlässlich finden",
    template: "%s | fund24",
  },
  description:
    "KI-gestützte Fördermittel-Plattform nach deutschem Recht. 3.400+ geprüfte Programme, BAFA-zertifizierte Berater, rechtssichere Antragstellung.",
  applicationName: "fund24",
  keywords: [
    "Fördermittel", "Förderprogramme", "Fördercheck", "Zuschüsse",
    "BAFA", "KfW", "Unternehmen", "Förderberater", "Mittelstand", "KMU",
    "Governance", "Compliance", "Rechtssicher",
  ],
  authors: [{ name: "fund24" }],
  creator: "Fröba Sales Solutions UG",
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "https://fund24.io",
    siteName: "fund24",
    title: "fund24 — Fördermittel verlässlich finden",
    description:
      "KI-gestützte Fördermittel-Plattform nach deutschem Recht. 3.400+ geprüfte Programme. BAFA-zertifizierte Berater.",
  },
  twitter: {
    card: "summary_large_image",
    title: "fund24 — Fördermittel verlässlich finden",
    description:
      "KI-gestützte Fördermittel-Plattform nach deutschem Recht. Rechtssicher von Antrag bis Abwicklung.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F1E6" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1528" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "fund24",
              legalName: "Fröba Sales Solutions UG (haftungsbeschränkt)",
              url: "https://fund24.io",
              logo: "https://fund24.io/icon.png",
              description:
                "KI-gestützte Fördermittel-Plattform nach deutschem Recht. 3.400+ Programme, Berater-Matching, rechtssichere Antragstellung.",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Johann-Nikolaus-Zitter Str. 31",
                postalCode: "96317",
                addressLocality: "Kronach",
                addressCountry: "DE",
              },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: "support@fund24.io",
                telephone: "+49-151-29617192",
                availableLanguage: ["de"],
              },
              areaServed: "DE",
            }),
          }}
        />
      </head>
      <body
        className={`${sourceSerif.variable} ${inter.variable} ${jetBrainsMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <CookieBanner />
        <ConsentGatedAnalytics />
      </body>
    </html>
  );
}
