"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Brand from "./Brand";

const links = [
  ["billing", "Facturation", "M6 3h12v18l-3-2-3 2-3-2-3 2V3Z M9 8h6 M9 12h6"],
  ["quotes", "Soumissions", "M6 3h9l4 4v14H6V3Z M14 3v5h5 M9 12h7 M9 16h5"],
  [
    "reports",
    "Rapports & Taxes",
    "M4 19h16 M7 16v-5 M12 16V7 M17 16v-8",
  ],
  [
    "calculator",
    "Calculateur TPS/TVQ",
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M7 7h10v3H7V7Z M8 14h2 M12 14h2 M8 18h2 M12 18h2",
  ],
  [
    "company",
    "Mon entreprise",
    "M4 21V7l8-4 8 4v14 M2 21h20 M9 21v-6h6v6 M8 9h1 M15 9h1 M8 12h1 M15 12h1",
  ],
  ["expenses", "Dépenses", "M3 6h18v14H3V6Z M3 10h18 M15 15h3 M6 3h12"],
  ["subscription", "Abonnement", "M3 5h18v14H3V5Z M3 9h18 M7 14h4 M16 14h1"],
];

function Navigation() {
  const router = useRouter();
  const tab = useSearchParams().get("tab") || "billing";
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <aside className="workspace-sidebar">
      <Brand />
      <span className="sidebar-caption">MON ESPACE DE TRAVAIL</span>
      <nav aria-label="Espace de travail">
        {links.map(([id, label, icon]) => (
          <Link
            key={id}
            href={`/dashboard?tab=${id}`}
            className={tab === id ? "active" : ""}
            aria-current={tab === id ? "page" : undefined}
          >
            <svg
              className="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={icon} />
            </svg>
            {label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <strong>Exports comptables</strong>
          <p>Téléchargez vos factures (CSV) ou la sauvegarde complète (JSON).</p>
          <div className="sidebar-export-links">
            <a href="/api/export/csv?type=invoices" className="text-link">
              Factures CSV ↓
            </a>
            <a href="/api/export" className="text-link">
              Archive JSON ↓
            </a>
          </div>
        </div>
        <Link href="/contact">Aide et contact ↗</Link>
        <form action="/api/auth/logout" method="post" onSubmit={logout}>
          <button type="submit" disabled={loggingOut} className="logout-button">
            {loggingOut ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </form>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={null}>
      <Navigation />
    </Suspense>
  );
}
