"use client";
import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  const mainLinks = [
    { name: "Facturation", tab: null, href: "/dashboard", icon: "📊" },
    { name: "Données de l'entreprise", tab: "company", href: "/dashboard?tab=company", icon: "🏢" },
    { name: "Dépenses", tab: "expenses", href: "/dashboard?tab=expenses", icon: "💸" },
    { name: "Confidentialité (Loi 25)", tab: "privacy", href: "/dashboard?tab=privacy", icon: "🛡️" },
    { name: "Abonnement", tab: "subscription", href: "/dashboard?tab=subscription", icon: "💳" },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen sticky top-0 p-4 flex flex-col justify-between border-r border-slate-800 shrink-0 overflow-y-auto">
      <div>
        {/* Titre App */}
        <div className="mb-6 px-2 pt-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            📊 Québec Facture
          </h1>
          <span className="text-[11px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded mt-1 inline-block">
            Loi 25 Conforme
          </span>
        </div>

        {/* Navigation Principale */}
        <nav className="space-y-1 mb-6">
          <p className="px-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
            Menu Principal
          </p>
          {mainLinks.map((link) => {
            // Déterminer si le lien est actif selon l'URL et le paramètre 'tab'
            const isActive =
              pathname === "/dashboard" &&
              (link.tab === null ? !currentTab || currentTab === "billing" : currentTab === link.tab);

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>{link.icon}</span>
                <span className="truncate">{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bloc Quick / Support & Légal tout en bas */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        <p className="px-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Aide & Légal
        </p>

        <div className="space-y-1 text-xs">
          <Link
            href="/contact"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
              pathname === "/contact"
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>📬</span>
            <span>Contact & Support</span>
          </Link>

          <Link
            href="/dashboard?tab=privacy"
            className="block px-3 py-1.5 text-slate-400 hover:text-white transition"
          >
            🔒 Confidentialité (Loi 25)
          </Link>
        </div>

        {/* Bouton de déconnexion */}
        <div className="pt-2 border-t border-slate-800">
          <Link
            href="/api/auth/logout"
            className="flex items-center gap-3 px-3 py-2 text-sm text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 rounded-lg transition"
          >
            <span>🚪</span>
            <span>Se déconnecter</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
export default function Sidebar() {
  return (
    <Suspense fallback={null}>
      <SidebarContent />
    </Suspense>
  );
}