import type { Metadata } from "next";
import { Suspense } from "react";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { PageViewTracker } from "@/lib/analytics/trackVisit";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://stopme.in";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Spotme — AI Event Photo Delivery. Instant, Private & Frictionless.",
    template: "%s | Spotme",
  },
  description:
    "Spotme uses AI facial recognition to instantly match and deliver event photos to guests via a QR code selfie. No app downloads. Works for weddings, corporate events, birthdays & more across India.",
  keywords: [
    "AI event photo sharing India",
    "instant wedding photo delivery",
    "AI face recognition event photography",
    "QR code photo gallery",
    "automated event photo distribution",
    "private photo sharing for events",
    "wedding photo delivery software India",
    "event photographer tools",
    "selfie photo matching",
    "AI powered photo gallery",
  ],
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    title: "Spotme — AI Event Photo Delivery. Instant, Private & Frictionless.",
    description:
      "Spotme uses AI facial recognition to instantly match and deliver event photos to guests via a QR code selfie. No app downloads. Works for weddings, corporate events, birthdays & more.",
    type: "website",
    locale: "en_IN",
    siteName: "Spotme",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Spotme — AI-powered event photo delivery for weddings and events in India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spotme — AI Event Photo Delivery. Instant, Private & Frictionless.",
    description:
      "Spotme uses AI facial recognition to instantly match and deliver event photos to guests via a QR code selfie. No app downloads. Works for weddings, corporate events & more.",
    images: ["/opengraph-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// ── JSON-LD Structured Data ────────────────────────────────────────────────────
// Organization + WebSite + SoftwareApplication schema for Google rich results
// and GEO (Generative Engine Optimization) — helps AI engines cite Spotme.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "Spotme",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.svg`,
        width: 512,
        height: 512,
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+91-89198-85401",
        contactType: "customer support",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi"],
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Hyderabad",
        addressRegion: "Telangana",
        addressCountry: "IN",
      },
      description:
        "Spotme is an AI-powered event photo platform based in Hyderabad, India. It uses facial recognition to deliver private, personalised photo galleries to event guests instantly via a QR code selfie — no app download required.",
      foundingLocation: "Hyderabad, India",
      areaServed: "India",
    },
    {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      url: baseUrl,
      name: "Spotme",
      description:
        "AI-powered event photo delivery for weddings, corporate events, and birthdays across India.",
      publisher: { "@id": `${baseUrl}/#organization` },
      inLanguage: "en-IN",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${baseUrl}/#software`,
      name: "Spotme",
      applicationCategory: "WebApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires a modern web browser. No app download needed.",
      description:
        "AI-powered event photo delivery. Guests scan a custom QR code at the venue, upload a selfie, and instantly receive their own private high-resolution photo gallery. Powered by AI face recognition (ArcFace / InsightFace). No app required.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "0",
        highPrice: "1599",
        priceCurrency: "INR",
        offerCount: "5",
      },
      author: { "@id": `${baseUrl}/#organization` },
      featureList: [
        "AI facial recognition photo matching (ArcFace / InsightFace)",
        "QR code-based frictionless guest onboarding",
        "Instant private photo gallery delivery",
        "WhatsApp notification support for delayed matches",
        "High-resolution photo downloads",
        "Privacy mode — guests only see photos of themselves",
        "Custom event branding",
        "Team collaboration for studios",
      ],
      availableOnDevice: "Web Browser",
      countriesSupported: "IN",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-surface">
        {/* Global JSON-LD structured data for Google and AI engines (GEO) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {/* Invisible page-view tracker — fires on every public page navigation */}
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
