import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Import Sonner
import { Toaster } from "sonner";
import { InstallPrompt } from "@/components/install-prompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shree Sai Engineering",
  description: "Employee attendance and payroll management system",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Shree Sai",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}

        {/* Toaster */}
        <Toaster />
        <InstallPrompt />
      </body>
    </html>
  );
}
