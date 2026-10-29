import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { BRAND } from "@/lib/brand";
import { themeScript } from "@/lib/theme-script";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description: "Drop in phone photos of your jewellery and get catalogue photos back. The design stays exactly as it is.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#121113" },
    { media: "(prefers-color-scheme: light)", color: "#f6f3ee" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The theme script sets data-theme on <html> before React loads, so React must not treat it as a mismatch.
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${bricolage.variable} ${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
