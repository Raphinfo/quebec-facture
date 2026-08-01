import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Colonne 1 : À propos */}
          <div className="space-y-3 md:col-span-1">
            <span className="text-lg font-bold text-white flex items-center gap-2">
              📊 Québec Facture
            </span>
            <p className="text-slate-400 text-xs leading-relaxed">
              La solution simple, rapide et conforme pour la gestion de factures, des dépenses et de la TPS/TVQ pour les entrepreneurs et travailleurs autonomes du Québec.
            </p>
          </div>

          {/* Colonne 2 : Navigation produit */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Produit</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-white transition">
                  Tableau de bord
                </Link>
              </li>
              <li>
                <Link href="/dashboard?tab=billing" className="hover:text-white transition">
                  Abonnements & Tarifs
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Support & Aide
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Liens Légaux (Critiques pour Stripe & Loi 25) */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Légal & Conformité</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/politique-de-confidentialite" className="hover:text-white transition">
                  Politique de confidentialité (Loi 25)
                </Link>
              </li>
              <li>
                <Link href="/conditions" className="hover:text-white transition">
                  Conditions d'utilisation (CGU/CGV)
                </Link>
              </li>
              <li>
                <span className="inline-block px-2 py-0.5 text-[10px] bg-slate-800 text-emerald-400 border border-emerald-500/30 rounded mt-1">
                  🔒 Données hébergées au Canada
                </span>
              </li>
            </ul>
          </div>

          {/* Colonne 4 : Coordonnées */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Contact</h3>
            <ul className="space-y-2 text-xs">
              <li>📍 Matane, Québec, Canada</li>
              <li>
                ✉️{" "}
                <a href="mailto:support@quebecfacture.com" className="hover:text-white transition">
                  support@quebecfacture.com
                </a>
              </li>
              <li className="pt-2 text-[11px] text-slate-500">
                Paiements sécurisés par <strong>Stripe</strong>.
              </li>
            </ul>
          </div>

        </div>

        {/* Ligne inférieure */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Québec Facture. Tous droits réservés.</p>
          <p className="text-center sm:text-right">
            Conçu avec soin au Québec 🇨🇦
          </p>
        </div>
      </div>
    </footer>
  );
}