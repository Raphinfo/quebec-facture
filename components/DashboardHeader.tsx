"use client";

export default function DashboardHeader({ userName = "Entrepreneur" }: { userName?: string }) {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-200">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Bonjour, {userName} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Voici le résumé de vos factures, dépenses et taxes pour ce mois-ci.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Statut du compte / Loi 25 */}
        <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Conforme Loi 25
        </span>

        {/* Bouton d'action rapide */}
        <a
          href="#create-invoice"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm hover:shadow transition flex items-center gap-2"
        >
          <span>➕</span>
          <span>Créer une facture</span>
        </a>
      </div>
    </header>
  );
}