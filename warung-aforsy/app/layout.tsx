import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Warungku",
  description: "Aplikasi kasir warung keluarga — cepat, sederhana, terpercaya.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${jakartaSans.variable} ${plexMono.variable}`}>
      <body>
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
