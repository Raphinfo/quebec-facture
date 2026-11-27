"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";
export default function Page() {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function checkout(trial: boolean) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trial }),
        }),
        d = await r.json();
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) throw new Error(d.error);
      window.location.assign(d.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Service indisponible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="plans-page">
      <Brand />
      <div className="section-heading">
        <span className="eyebrow">CHOISISSEZ VOTRE RYTHME</span>
        <h1>
          Une place pour chaque étape
          <br />
          de votre entreprise.
        </h1>
        <p>
          Commencez avec trois factures gratuites ou passez à une facturation
          régulière.
        </p>
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <div className="plan-grid">
        <article className="price-card">
          <span className="eyebrow">DÉCOUVERTE</span>
          <h2>
            0 $ <small>CAD</small>
          </h2>
          <p>Trois factures au total, sans carte bancaire.</p>
          <ul>
            <li>Clients et soumissions</li>
            <li>Suivi des dépenses</li>
            <li>Impression et export des données</li>
          </ul>
          <Link href="/dashboard" className="button secondary">
            Continuer gratuitement →
          </Link>
        </article>
        <article className="price-card pro">
          <span className="eyebrow">PROFESSIONNEL</span>
          <h2>
            15 $ <small>CA / mois</small>
          </h2>
          <p>Des factures illimitées avec un abonnement actif.</p>
          <ul>
            <li>Toutes les fonctions du forfait gratuit</li>
            <li>Gestion de l’abonnement dans Stripe</li>
            <li>Essai de trois jours disponible une fois</li>
          </ul>
          <button
            disabled={busy}
            className="button primary"
            onClick={() => void checkout(true)}
          >
            Essayer Pro pendant 3 jours
          </button>
          <button
            disabled={busy}
            className="text-link"
            onClick={() => void checkout(false)}
          >
            M’abonner immédiatement
          </button>
          <small>
            Environnement de démonstration Stripe Test uniquement : aucun
            paiement réel n’est effectué (utilisez uniquement une carte de test
            Stripe).
          </small>
        </article>
      </div>
      <Link href="/dashboard" className="text-link">
        ← Retour à mon espace
      </Link>
    </section>
  );
}
