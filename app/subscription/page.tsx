'use client';

import React, { useEffect, useState } from 'react';

type SubscriptionInfo = {
  plan: 'FREE' | 'PRO';
  subscriptionStatus:
    | 'PENDING'
    | 'TRIALING'
    | 'ACTIVE'
    | 'PAST_DUE'
    | 'CANCELED';
  stripeCustomerId?: string | null;
  stripeSubId?: string | null;
  trialEnd?: string | null;
  currentPeriodEnd?: string | null;
};

export default function SubscriptionTab() {
  const [subscription, setSubscription] =
    useState<SubscriptionInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');

  // ============================================================
  // CHARGER L'ABONNEMENT ACTUEL
  // ============================================================
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        setError('');

        const res = await fetch('/api/stripe/subscription', {
          method: 'GET',
          cache: 'no-store',
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Impossible de récupérer l'abonnement."
          );
        }

        setSubscription(data);
      } catch (err) {
        console.error(
          'Erreur récupération abonnement :',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Une erreur est survenue.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, []);

  // ============================================================
  // OUVRIR LE PORTAIL STRIPE
  // ============================================================
  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      setError('');

      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Impossible d'ouvrir la gestion de l'abonnement."
        );
      }

      if (!data.url) {
        throw new Error(
          "Stripe n'a retourné aucune URL."
        );
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Erreur portail Stripe :', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de contacter Stripe.'
      );

      setPortalLoading(false);
    }
  };

  // ============================================================
  // VOIR LES FORFAITS
  // ============================================================
  const handleChoosePlan = () => {
    window.location.href = '/choose-plan';
  };

  // ============================================================
  // FORMATTER UNE DATE
  // ============================================================
  const formatDate = (date?: string | null) => {
    if (!date) return null;

    return new Intl.DateTimeFormat('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  // ============================================================
  // CHARGEMENT
  // ============================================================
  if (loading) {
    return (
      <div
        style={{
          padding: '50px',
          textAlign: 'center',
          color: '#718096',
        }}
      >
        Chargement de votre abonnement...
      </div>
    );
  }

  if (!subscription) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
        }}
      >
        <p>
          Impossible de récupérer votre abonnement.
        </p>
      </div>
    );
  }

  const isTrial =
    subscription.subscriptionStatus === 'TRIALING';

  const isPro =
    subscription.plan === 'PRO' &&
    subscription.subscriptionStatus === 'ACTIVE';

  const isPastDue =
    subscription.subscriptionStatus === 'PAST_DUE';

  const isFree =
    subscription.plan === 'FREE' &&
    !isTrial &&
    !isPro &&
    !isPastDue;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '760px',
        margin: '0 auto',
        padding: '20px 0',
      }}
    >
      {/* TITRE */}

      <div
        style={{
          textAlign: 'center',
          marginBottom: '35px',
        }}
      >
        <h2
          style={{
            fontSize: '26px',
            color: '#2d3748',
            marginBottom: '10px',
          }}
        >
          Mon abonnement
        </h2>

        <p
          style={{
            color: '#718096',
            fontSize: '14px',
          }}
        >
          Consultez et gérez votre forfait Québec Facture.
        </p>
      </div>

      {/* ERREUR */}

      {error && (
        <div
          style={{
            padding: '14px',
            marginBottom: '20px',
            backgroundColor: '#fff5f5',
            border: '1px solid #fed7d7',
            color: '#c53030',
            borderRadius: '8px',
          }}
        >
          {error}
        </div>
      )}

      {/* CARTE PRINCIPALE */}

      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '32px',
          boxShadow:
            '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}
      >

        {/* ================= FREE ================= */}

        {isFree && (
          <>
            <span
              style={{
                backgroundColor: '#edf2f7',
                color: '#4a5568',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              PLAN ACTUEL
            </span>

            <h3
              style={{
                fontSize: '25px',
                marginTop: '18px',
                color: '#2d3748',
              }}
            >
              Plan Free
            </h3>

            <div
              style={{
                fontSize: '34px',
                fontWeight: 'bold',
                margin: '15px 0',
              }}
            >
              0,00 $
              <span
                style={{
                  fontSize: '14px',
                  color: '#a0aec0',
                  fontWeight: 'normal',
                }}
              >
                {' '}
                / mois
              </span>
            </div>

            <p style={{ color: '#718096' }}>
              Votre forfait gratuit est actif.
            </p>

            <ul
              style={{
                lineHeight: '2',
                marginTop: '25px',
              }}
            >
              <li>✅ Jusqu'à 3 factures</li>
              <li>✅ Gestion des clients</li>
              <li>✅ Calcul TPS et TVQ</li>
              <li>✅ Gestion de base des dépenses</li>
            </ul>

            <button
              onClick={handleChoosePlan}
              style={{
                width: '100%',
                marginTop: '25px',
                padding: '13px',
                backgroundColor: '#3182ce',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Voir les options de forfait
            </button>
          </>
        )}

        {/* ================= TRIAL ================= */}

        {isTrial && (
          <>
            <span
              style={{
                backgroundColor: '#ebf4ff',
                color: '#4c51bf',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              ESSAI EN COURS
            </span>

            <h3
              style={{
                fontSize: '25px',
                marginTop: '18px',
                color: '#2d3748',
              }}
            >
              🎁 Essai Pro
            </h3>

            <div
              style={{
                fontSize: '34px',
                fontWeight: 'bold',
                color: '#4c51bf',
                margin: '15px 0',
              }}
            >
              0,00 $
            </div>

            <p style={{ color: '#4a5568' }}>
              Vous profitez actuellement de toutes les
              fonctionnalités du Plan Professionnel.
            </p>

            {subscription.trialEnd && (
              <div
                style={{
                  marginTop: '25px',
                  padding: '18px',
                  backgroundColor: '#ebf4ff',
                  borderRadius: '10px',
                }}
              >
                <strong>Fin de l'essai :</strong>{' '}
                {formatDate(subscription.trialEnd)}

                <div style={{ marginTop: '8px' }}>
                  Ensuite : <strong>15,00 $ CA / mois</strong>
                </div>
              </div>
            )}

            <p
              style={{
                marginTop: '18px',
                fontSize: '13px',
                color: '#718096',
              }}
            >
              Vous pouvez annuler avant la fin de votre
              période d'essai afin de ne pas être facturé.
            </p>

            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              style={{
                width: '100%',
                marginTop: '25px',
                padding: '13px',
                backgroundColor: '#4c51bf',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: portalLoading
                  ? 'not-allowed'
                  : 'pointer',
                opacity: portalLoading ? 0.6 : 1,
              }}
            >
              {portalLoading
                ? 'Ouverture...'
                : "Gérer ou annuler l'essai"}
            </button>
          </>
        )}

        {/* ================= PRO ================= */}

        {isPro && (
          <>
            <span
              style={{
                backgroundColor: '#f0fff4',
                color: '#276749',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              ABONNEMENT ACTIF
            </span>

            <h3
              style={{
                fontSize: '25px',
                marginTop: '18px',
                color: '#2d3748',
              }}
            >
              ⚡ Plan Professionnel
            </h3>

            <div
              style={{
                fontSize: '34px',
                fontWeight: 'bold',
                color: '#2b6cb0',
                margin: '15px 0',
              }}
            >
              15,00 $
              <span
                style={{
                  fontSize: '14px',
                  color: '#a0aec0',
                  fontWeight: 'normal',
                }}
              >
                {' '}
                CA / mois
              </span>
            </div>

            <p style={{ color: '#4a5568' }}>
              Votre abonnement Professionnel est actif.
            </p>

            {subscription.currentPeriodEnd && (
              <div
                style={{
                  marginTop: '25px',
                  padding: '18px',
                  backgroundColor: '#f7fafc',
                  borderRadius: '10px',
                }}
              >
                <strong>Prochain renouvellement :</strong>{' '}
                {formatDate(
                  subscription.currentPeriodEnd
                )}
              </div>
            )}

            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              style={{
                width: '100%',
                marginTop: '25px',
                padding: '13px',
                backgroundColor: '#38a169',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: portalLoading
                  ? 'not-allowed'
                  : 'pointer',
                opacity: portalLoading ? 0.6 : 1,
              }}
            >
              {portalLoading
                ? 'Ouverture...'
                : "Gérer l'abonnement"}
            </button>
          </>
        )}

        {/* ================= PAST DUE ================= */}

        {isPastDue && (
          <>
            <span
              style={{
                backgroundColor: '#fff5f5',
                color: '#c53030',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              PAIEMENT À RÉGULARISER
            </span>

            <h3
              style={{
                marginTop: '18px',
                fontSize: '25px',
              }}
            >
              Plan Professionnel
            </h3>

            <p
              style={{
                marginTop: '20px',
                color: '#c53030',
              }}
            >
              Un problème est survenu avec votre dernier
              paiement.
            </p>

            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              style={{
                width: '100%',
                marginTop: '25px',
                padding: '13px',
                backgroundColor: '#c53030',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Régulariser mon abonnement
            </button>
          </>
        )}

      </div>
    </div>
  );
}