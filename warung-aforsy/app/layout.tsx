import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import SWRegistration from "@/components/SWRegistration";
import "./globals.css";

const jakartaSans = localFont({
  variable: "--font-plus-jakarta-sans",
  display: "swap",
  src: [
    { path: "../public/fonts/plus-jakarta-sans-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/plus-jakarta-sans-latin-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/plus-jakarta-sans-latin-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/plus-jakarta-sans-latin-700.woff2", weight: "700", style: "normal" },
  ],
});

const plexMono = localFont({
  variable: "--font-ibm-plex-mono",
  display: "swap",
  src: [
    { path: "../public/fonts/ibm-plex-mono-latin-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/ibm-plex-mono-latin-700.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Warung Aforsy",
  description: "Aplikasi kasir warung keluarga — cepat, sederhana, terpercaya.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Warung Aforsy",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0F7A5C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${jakartaSans.variable} ${plexMono.variable}`}>
      <body>
        <SWRegistration />
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={3000}
          toastOptions={{
            style: {
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              fontWeight: 500,
            },
          }}
        />
      </body>
    </html>
  );
}
