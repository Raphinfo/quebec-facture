import type { Metadata } from "next";

import Footer from "@/components/Footer";
import "./globals.css";

const appBase = (() => {
  try {
    return new URL(process.env.APP_URL || "https://quebecfacture.com");
  } catch {
    return new URL("https://quebecfacture.com");
  }
})();

export const metadata: Metadata = {
  metadataBase: appBase,
  title: "Québec Facture — Facturation, Soumissions & TPS/TVQ",
  description:
    "Logiciel de facturation simple et moderne pour travailleurs autonomes et PME du Québec : soumissions, factures PDF, Virement Interac, rapports TPS/TVQ et export comptable.",
  openGraph: {
    title: "Québec Facture — Facturation, Soumissions & TPS/TVQ",
    description:
      "Créez et envoyez vos soumissions et factures PDF avec calcul exact TPS/TVQ, Virement Interac et rapports fiscaux pour le Québec.",
    type: "website",
    locale: "fr_CA",
    siteName: "Québec Facture",
  },
  twitter: {
    card: "summary_large_image",
    title: "Québec Facture — Facturation & TPS/TVQ",
    description:
      "Facturation simple pour travailleurs autonomes et PME du Québec. 3 factures gratuites.",
  },
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
