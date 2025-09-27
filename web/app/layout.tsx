import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";

import "./globals.css";
import { AuthProvider } from "@/contexts/auth";

export const metadata: Metadata = {
  title: "CraftCtrl",
  description: "Manage your Minecraft servers with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body className="min-h-svh">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
