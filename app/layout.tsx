import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Manrope, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/cookie-banner/CookieBanner";
import { ConsentGatedAnalytics } from "@/components/analytics/ConsentGatedAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fund24.io"),
  title: {
    default: "fund24 – Fördermittel einfach finden",
    template: "%s | fund24",
  },
  description:
    "Kostenloser KI-Fördercheck für Unternehmen. 3.400+ aktive Förderprogramme. Berater-Matching. Antrag, Bericht und Abwicklung an einem Ort.",
  applicationName: "fund24",
  keywords: [
    "Fördermittel", "Förderprogramme", "Fördercheck", "Zuschüsse",
    "BAFA", "KfW", "Unternehmen", "Förderberater", "Mittelstand", "KMU",
  ],
  authors: [{ name: "fund24" }],
  creator: "Fröba Sales Solutions UG",
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "https://fund24.io",
    siteName: "fund24",
    title: "fund24 – Fördermittel einfach finden",
    description:
      "Kostenloser KI-Fördercheck. 3.400+ aktive Förderprogramme. Berater-Matching. Von Antrag bis Abwicklung auf einer Plattform.",
  },
  twitter: {
    card: "summary_large_image",
    title: "fund24 – Fördermittel einfach finden",
    description:
      "Kostenloser KI-Fördercheck für Unternehmen. Programme, Berater, Anträge, Berichte — alles an einem Ort.",
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
                "Plattform für Fördermittel: KI-Fördercheck, 3.400+ Programme, Berater-Matching, Antragstellung und Abwicklung.",
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
        className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${inter.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <CookieBanner />
        <ConsentGatedAnalytics />
      </body>
    </html>
  );
}
