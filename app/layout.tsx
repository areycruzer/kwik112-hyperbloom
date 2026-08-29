import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dispatch AI — Emergency Command Platform",
  description:
    "AI-assisted emergency dispatch: incident monitoring, unit dispatch, pathfinding, and 112 Pulse emotion-aware voice intake.",
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
