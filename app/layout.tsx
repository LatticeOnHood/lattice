import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Providers } from "@/components/web3/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "Lattice (LAT) — On-Chain Verification Protocol",
  description:
    "Tag @LatticeBot with a contract address and get a structured on-chain report in-thread: liquidity, holder concentration, market cap, contract risk signals and Promises Kept. Read-only — no wallet, no signature, no gas.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  openGraph: {
    title: "Lattice (LAT) — On-Chain Verification Protocol",
    description:
      "Verify before you buy. On-chain verification delivered natively in your X timeline.",
    images: ["/banner1.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className}`}>
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  );
}
