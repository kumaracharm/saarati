import type { Metadata, Viewport } from "next";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { LanguageProvider } from "../components/LanguageProvider";
import SaarthiAssistant from "../components/SaarthiAssistant";

import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAARTHI",
  description: "India's Citizen Benefits Discovery & Assistance Platform",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#142235",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bigsur-canvas flex min-h-screen flex-col font-sans text-[var(--foreground)]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--background)] focus:px-3 focus:py-2 focus:text-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]"
        >
          Skip to content
        </a>
        <ServiceWorkerRegister />
        <LanguageProvider>
          <Header />
          <main
            id="main-content"
            className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6"
          >
            {children}
          </main>
          <Footer />
        </LanguageProvider>
        <SaarthiAssistant />
      </body>
    </html>
  );
}
