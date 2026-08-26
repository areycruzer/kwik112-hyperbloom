import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pulse112 Tactical CAD - Emergency Response Command",
  description: "AI-powered emergency dispatch with voice triage, Hume emotion detection, responder pathfinding, and autonomous triage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#060a12] text-slate-100 min-h-screen selection:bg-blue-600 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
