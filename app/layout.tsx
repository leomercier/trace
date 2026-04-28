import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono, Caveat } from "next/font/google";
import "@/styles/globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-hand", display: "swap" });

export const metadata: Metadata = {
  title: "Trace — measure & annotate drawings, together",
  description:
    "A free, browser-based collaborative canvas for measuring and annotating drawings. DWG, DXF, PDF, SVG, PNG. Real-time, mobile-ready.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
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
      className={`${fraunces.variable} ${inter.variable} ${mono.variable} ${caveat.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
