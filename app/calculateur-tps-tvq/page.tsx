import type { Metadata } from "next";
import Link from "next/link";
import Brand from "@/components/Brand";
import TaxCalculator from "@/components/TaxCalculator";

export const metadata: Metadata = {
  title: "Calculateur TPS et TVQ Québec 2026 gratuit | Québec Facture",
  description:
    "Calculez instantanément la TPS (5 %) et la TVQ (9,975 %) au Québec, avant ou après taxes, puis créez vos factures conformes en quelques clics.",
};

export default function CalculateurTpsTvqPage() {
  return (
    <div className="landing">
      <header className="marketing-nav">
        <Brand />
        <nav aria-label="Navigation principale">
          <Link href="/#fonctionnement">Fonctionnement</Link>
          <Link href="/#tarifs">Tarifs</Link>
          <Link href="/login">Connexion</Link>
          <Link className="button primary small-button" href="/register">
            Commencer →
          </Link>
        </nav>
      </header>

      <section className="marketing-section calc-page">
        <div className="section-heading calc-header">
          <span className="eyebrow">OUTIL GRATUIT · QUÉBEC</span>
          <h1>Calculateur TPS &amp; TVQ (2026)</h1>
          <p className="muted">
            Ajoutez ou extrayez facilement la TPS (5 %) et la TVQ (9,975 %) sur
            vos montants en dollars canadiens (taux combiné de 14,975 %).
          </p>
        </div>

        <TaxCalculator />

        <div className="calc-info-grid">
          <article className="panel">
            <h3>Comment calculer les taxes au Québec ?</h3>
            <p className="muted">
              Au Québec, la TPS fédérale (5 %) et la TVQ provinciale (9,975 %)
              s’appliquent toutes deux sur le montant hors taxes depuis
              l’harmonisation, soit un taux combiné exact de{" "}
              <strong>14,975 %</strong>.
            </p>
          </article>
          <article className="panel">
            <h3>À partir de quand s’inscrire aux taxes ?</h3>
            <p className="muted">
              En règle générale, l’inscription aux fichiers de la TPS et de la
              TVQ devient obligatoire lorsque vos revenus taxables dépassent{" "}
              <strong>30 000 $</strong> sur quatre trimestres civils
              consécutifs.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
