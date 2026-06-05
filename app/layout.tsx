import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://stopme.in";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Revela | Digital Keepsakes for Your Most Cherished Moments",
  description: "Capture every smile and deliver it instantly with the warmth and care it deserves. Revela bridges the gap between the camera and the guest.",
  openGraph: {
    title: "Revela | Digital Keepsakes for Your Most Cherished Moments",
    description: "Capture every smile and deliver it instantly with the warmth and care it deserves. Revela bridges the gap between the camera and the guest.",
    type: "website",
    locale: "en_US",
    siteName: "Revela",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Revela - Digital Keepsakes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Revela | Digital Keepsakes for Your Most Cherished Moments",
    description: "Capture every smile and deliver it instantly with the warmth and care it deserves. Revela bridges the gap between the camera and the guest.",
    images: ["/opengraph-image.png"],
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
      className={`${playfair.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-surface">
        {children}
      </body>
    </html>
  );
}
