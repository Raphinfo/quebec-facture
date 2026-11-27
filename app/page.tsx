import Link from "next/link";
import Brand from "@/components/Brand";

const FAQS = [
  [
    "Comment fonctionne le forfait gratuit Découverte ?",
    "Vous pouvez créer votre compte sans carte bancaire, configurer votre entreprise, gérer vos clients et émettre jusqu’à 3 factures complètes (avec soumissions illimitées, suivi des dépenses et export de vos données).",
  ],
  [
    "La TPS (5 %) et la TVQ (9,975 %) sont-elles calculées automatiquement ?",
    "Oui. Dès que vous inscrivez vos numéros de TPS et TVQ dans Mon entreprise, les taxes sont calculées au cent près sur vos factures et soumissions, avec possibilité d’exempter une ligne si besoin.",
  ],
  [
    "Comment mes clients me paient-ils ?",
    "Indiquez simplement votre courriel pour Virement Interac dans Mon entreprise : vos instructions de virement s’affichent automatiquement sur chaque facture PDF et dans les courriels envoyés à vos clients.",
  ],
  [
    "Puis-je annuler mon abonnement Professionnel à tout moment ?",
    "Oui, en deux clics depuis l’onglet Abonnement via le portail sécurisé Stripe. Vous conservez l’accès à votre historique et l’export complet (CSV et JSON) de toutes vos données.",
  ],
  [
    "Comment préparer ma déclaration de TPS/TVQ ?",
    "L’onglet Rapports & Taxes compile vos ventes hors taxes, la TPS perçue, la TVQ perçue et vos dépenses par trimestre ou année, avec export CSV prêt pour votre comptable.",
  ],
];

export default function Home() {
  return (
    <div className="landing">
      <header className="marketing-nav">
        <Brand />
        <nav aria-label="Navigation principale">
          <a href="#fonctionnement">Fonctionnement</a>
          <Link href="/calculateur-tps-tvq">Calculateur TPS/TVQ</Link>
          <a href="#tarifs">Tarifs</a>
          <Link href="/login">Connexion</Link>
          <Link className="button primary small-button" href="/register">
            Commencer →
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="status-dot" /> CONÇU POUR LE QUÉBEC
          </span>
          <h1>
            Votre talent mérite
            <br />
            une belle <em>facture.</em>
          </h1>
          <p>
            De la première soumission à la facture payée par Virement Interac,
            suivez vos revenus, votre TPS/TVQ et vos dépenses dans un espace
            moderne et clair.
          </p>
          <div className="hero-actions">
            <Link href="/register" className="button primary">
              Créer ma première facture <span>↗</span>
            </Link>
            <Link href="/calculateur-tps-tvq" className="button secondary">
              Calculateur TPS/TVQ gratuit
            </Link>
          </div>
          <p className="hero-note">
            3 factures gratuites · Aucune carte requise pour commencer
          </p>
        </div>

        <div
          className="hero-preview"
          aria-label="Exemple illustratif de facture"
        >
          <div className="preview-top">
            <span className="preview-dot" />
            <span className="preview-dot" />
            <span className="preview-dot" />
            <span>Aperçu instantané · Prêt à envoyer</span>
          </div>
          <div className="invoice-preview">
            <div className="preview-heading">
              <span className="example-brand">
                Atelier Nord<span>DESIGN &amp; CRÉATION</span>
              </span>
              <span className="badge">PAYÉE</span>
            </div>
            <div className="preview-invoice-title">
              <h2>Facture</h2>
              <span>FAC-2026-000001</span>
            </div>
            <div className="preview-client">
              <span className="small muted">FACTURÉ À</span>
              <strong>Studio Boréal</strong>
              <span>Projet d’identité visuelle</span>
            </div>
            <div className="preview-line">
              <span>Direction artistique</span>
              <strong>800,00 $</strong>
            </div>
            <div className="preview-line">
              <span>Création graphique</span>
              <strong>400,00 $</strong>
            </div>
            <div className="preview-totals">
              <p>
                <span>Sous-total</span>
                <span>1 200,00 $</span>
              </p>
              <p>
                <span>TPS (5 %)</span>
                <span>60,00 $</span>
              </p>
              <p>
                <span>TVQ (9,975 %)</span>
                <span>119,70 $</span>
              </p>
              <p className="preview-total">
                <span>Total CAD</span>
                <strong>1 379,70 $</strong>
              </p>
            </div>
            <div className="preview-bottom">
              Virement Interac accepté · Merci de votre confiance.
            </div>
          </div>
          <div className="floating-note">
            <span>✓</span>
            <div>
              <strong>Taxes &amp; rapports prêts</strong>
              <small>TPS/TVQ calculées et exportables en CSV.</small>
            </div>
          </div>
        </div>
      </section>

      <div className="value-strip">
        <span>Soumissions &amp; conversion en 1 clic</span>
        <span>Calcul exact TPS / TVQ</span>
        <span>Envoi courriel &amp; Virement Interac</span>
        <span>Rapports fiscaux &amp; Export CSV</span>
      </div>

      <section id="fonctionnement" className="marketing-section">
        <div className="section-heading">
          <span className="eyebrow">DE L’IDÉE AU PAIEMENT</span>
          <h2>
            Moins de paperasse.
            <br />
            Plus de clarté pour votre entreprise.
          </h2>
        </div>
        <div className="steps-grid">
          {[
            [
              "01",
              "Configurez votre entreprise",
              "Ajoutez votre logo, vos numéros TPS/TVQ, votre délai de paiement et votre courriel Interac en une minute.",
            ],
            [
              "02",
              "Envoyez soumissions et factures",
              "Créez des documents professionnels, convertissez vos soumissions acceptées et envoyez-les par courriel ou PDF.",
            ],
            [
              "03",
              "Préparez vos impôts sans stress",
              "Consultez vos totaux trimestriels de TPS/TVQ, suivez vos dépenses et exportez tout en CSV pour votre comptable.",
            ],
          ].map(([n, t, d]) => (
            <article key={n}>
              <span className="step-number">{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="tarifs" className="marketing-section pricing-section">
        <div>
          <span className="eyebrow">UN FORFAIT TRANSPARENT</span>
          <h2>
            Commencez gratuitement.
            <br />
            Passez Pro quand vous facturez plus.
          </h2>
          <p>
            Testez toutes les fonctionnalités sur vos trois premières factures,
            sans engagement.
          </p>
          <Link href="/register" className="text-link">
            Créer mon espace →
          </Link>
        </div>

        <article className="price-card">
          <span className="eyebrow">DÉCOUVERTE</span>
          <h3>
            0 $ <small>CAD</small>
          </h3>
          <p>Idéal pour démarrer votre activité.</p>
          <ul>
            <li>3 factures émises au total</li>
            <li>Soumissions illimitées et carnet clients</li>
            <li>Suivi des dépenses et rapport TPS/TVQ</li>
            <li>Export CSV et JSON de vos données</li>
          </ul>
          <Link href="/register" className="button secondary">
            Commencer gratuitement
          </Link>
        </article>

        <article className="price-card pro">
          <div className="price-card-top">
            <span className="eyebrow">PROFESSIONNEL</span>
            <span className="badge popular-badge">Populaire</span>
          </div>
          <h3>
            15 $ <small>CA / mois</small>
          </h3>
          <p>Pour facturer toute l’année sans limite.</p>
          <ul>
            <li>Toutes les fonctions du forfait Découverte</li>
            <li>Factures illimitées et envoi par courriel</li>
            <li>Instructions Virement Interac intégrées</li>
            <li>Essai de 3 jours disponible via Stripe</li>
          </ul>
          <Link href="/register" className="button primary">
            Essayer Pro (3 jours gratuits)
          </Link>
          <small>
            Démonstration uniquement (environnement Stripe Test). Aucun paiement
            réel n’est encaissé sur cette version portfolio.
          </small>
        </article>
      </section>

      <section id="faq" className="marketing-section faq-section">
        <div className="section-heading">
          <span className="eyebrow">QUESTIONS FRÉQUENTES</span>
          <h2>Tout ce qu’il faut savoir avant de commencer.</h2>
        </div>
        <div className="faq-list">
          {FAQS.map(([question, answer]) => (
            <details key={question} className="faq-item">
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="closing-band">
        <div>
          <span className="eyebrow">PRÊT À FACTURER PLUS VITE ?</span>
          <h2>
            Ouvrez votre espace Québec Facture
            <br />
            et émettez votre première facture en 2 minutes.
          </h2>
        </div>
        <Link href="/register" className="button primary">
          Ouvrir mon espace gratuitement →
        </Link>
      </section>
    </div>
  );
}
