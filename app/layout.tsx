import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description: "Drop in phone photos of your jewellery and get catalogue photos back. The design stays exactly as it is.",
};

export const viewport: Viewport = { themeColor: "#121113" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bricolage.variable} ${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
