import type { Metadata } from "next";
import { Suspense } from "react";
import { Caveat } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/styles/globals.css";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";

// Caveat stays for handwritten-feeling sticky notes; everything else is Geist.
const caveat = Caveat({ subsets: ["latin"], variable: "--font-hand", display: "swap" });

export const metadata: Metadata = {
  title: "tracable — design with full visibility",
  description:
    "Open-source design and prototyping. Measure, annotate, and ship drawings together. DWG, DXF, PDF, SVG, PNG.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://tracable.dev"),
  openGraph: {
    title: "tracable",
    description:
      "Open-source design and prototyping. Measure, annotate, and ship drawings together.",
    type: "website",
    // Resolved against metadataBase → emits an absolute og:url tag.
    // Next.js merges the share-card image from app/opengraph-image.png.
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "tracable",
    description:
      "Open-source design and prototyping. Measure, annotate, and ship drawings together.",
  },
  // og:logo isn't part of the standard Metadata API. Pipe it through
  // `other` so Next emits the raw <meta property="og:logo" /> tag.
  // We point it at the 180×180 apple-icon, the largest square brand
  // glyph we serve.
  other: {
    "og:logo": "/apple-icon",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#fafaf9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${caveat.variable}`}
    >
      <body className="font-sans">
        <Suspense fallback={null}>
          <AnalyticsProvider />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
