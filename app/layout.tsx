import type { Metadata } from "next";

import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Québec Facture — Facturation, Soumissions & TPS/TVQ",
  description:
    "Logiciel de facturation simple et moderne pour travailleurs autonomes et PME du Québec : soumissions, factures, Virement Interac, rapports TPS/TVQ et export comptable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr-CA" className="h-full" data-scroll-behavior="smooth" suppressHydrationWarning>
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

      <body className="antialiased min-h-screen flex flex-col justify-between">
        <a className="skip-link" href="#main-content">
          Aller au contenu
        </a>
        <main id="main-content" className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
