import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Ricerca Manuali Ventilatori - Ferrari",
  description: "Sistema di ricerca e download manuali per ventilatori Ferrari",
};

// Loading component for Suspense
function SearchPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-4"></div>
        <p className="text-gray-600">Caricamento...</p>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${roboto.variable} font-sans antialiased`}
      >
        <Suspense fallback={<SearchPageLoading />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
