import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kwik 112 — AI voice call-taker and dispatch console for 112 emergencies",
  description:
    "Kwik 112 is a multilingual AI voice call-taker and auditable decision console that assists human emergency dispatchers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ground text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
