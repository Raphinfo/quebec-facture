import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Footer from "@/components/Footer";
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
  title: "Québec Facture - Facturation & TPS/TVQ",
  description:
    "Solution de facturation simple, rapide et conforme pour les entrepreneurs et travailleurs autonomes du Québec.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var theme = localStorage.getItem('theme') || 'system';

                  var resolvedTheme =
                    theme === 'system'
                      ? (
                          window.matchMedia('(prefers-color-scheme: dark)').matches
                            ? 'dark'
                            : 'light'
                        )
                      : theme;

                  document.documentElement.setAttribute(
                    'data-theme',
                    resolvedTheme
                  );
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col justify-between`}
      >
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}