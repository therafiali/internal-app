'use client';

import { Rubik, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import { ReduxProvider } from "@/redux/provider";
import AuthProvider from '@/providers/AuthProvider';
import { ActivityWrapper } from "@/components/ActivityWrapper";

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${rubik.variable} ${inter.variable} antialiased bg-black`}>

      <body
        className={`${rubik.variable} ${inter.className} antialiased bg-black min-h-screen`}
      >
        <ReduxProvider>
          <AuthProvider>
            <ActivityWrapper>
              {children}
            </ActivityWrapper>
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
