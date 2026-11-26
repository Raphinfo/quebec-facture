"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Info = {
  plan: string;
  subscriptionStatus: string;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
};
export default function SubscriptionPanel() {
  const [info, setInfo] = useState<Info | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/stripe/subscription")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setInfo(d);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function portal() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/stripe/portal", { method: "POST" }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      window.location.assign(d.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Service indisponible.");
    } finally {
      setBusy(false);
    }
  }
  const labels: Record<string, string> = {
    ACTIVE: "Actif",
    TRIALING: "Essai en cours",
    PAST_DUE: "Paiement à régulariser",
    CANCELED: "Terminé",
  };
  return (
    <section className="panel profile-panel">
      <span className="eyebrow">VOTRE ABONNEMENT</span>
      <h2>{info?.plan === "PRO" ? "Professionnel" : "Découverte"}</h2>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {!info && !error ? (
        <p>Chargement…</p>
      ) : (
        info && (
          <>
            <span
              className={`status-badge ${info.subscriptionStatus.toLowerCase()}`}
            >
              {labels[info.subscriptionStatus] || info.subscriptionStatus}
            </span>
            <p>
              {info.plan === "PRO"
                ? "Émettez des factures sans limite tant que votre abonnement est actif."
                : "Votre forfait gratuit comprend trois factures émises au total."}
            </p>
            {info.trialEnd && (
              <p>
                Fin de l’essai :{" "}
                {new Date(info.trialEnd).toLocaleDateString("fr-CA")}
              </p>
            )}
            {info.currentPeriodEnd && (
              <p>
                {info.cancelAtPeriodEnd
                  ? "Fin prévue de l’abonnement"
                  : "Fin de la période en cours"}{" "}
                : {new Date(info.currentPeriodEnd).toLocaleDateString("fr-CA")}
              </p>
            )}
            <div className="table-actions">
              {info.stripeCustomerId && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void portal()}
                >
                  {busy ? "Ouverture…" : "Gérer dans Stripe ↗"}
                </button>
              )}
              {info.plan !== "PRO" && (
                <Link className="button secondary" href="/choose-plan">
                  Voir les forfaits
                </Link>
              )}
            </div>
            <p className="field-help">
              Après un paiement, la confirmation peut prendre quelques instants.
              Rechargez la page si nécessaire. L’export de vos documents reste
              disponible.
            </p>
          </>
        )
      )}
    </section>
  );
}
