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

  cancelAtPeriodEnd?: boolean;
  cancelAt?: string | null;
};

export default function SubscriptionTab() {
  const [subscription, setSubscription] =
    useState<SubscriptionInfo | null>(null);

  const [loading, setLoading] = useState(true);

  const [portalLoading, setPortalLoading] =
    useState(false);

  const [error, setError] = useState('');

  // ============================================================
  // CHARGER L'ABONNEMENT ACTUEL
  // ============================================================

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(
          '/api/stripe/subscription',
          {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
          }
        );

        const contentType =
          res.headers.get('content-type');

        if (
          !contentType?.includes('application/json')
        ) {
          const text = await res.text();

          console.error(
            'Réponse abonnement non JSON :',
            text
          );

          throw new Error(
            'Le serveur a retourné une réponse inattendue.'
          );
        }

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Impossible de récupérer l'abonnement."
          );
        }

        console.log(
          'ABONNEMENT REÇU :',
          data
        );

        setSubscription({
          plan:
            data.plan === 'PRO'
              ? 'PRO'
              : 'FREE',

          subscriptionStatus:
            data.subscriptionStatus ||
            'ACTIVE',

          stripeCustomerId:
            typeof data.stripeCustomerId ===
            'string'
              ? data.stripeCustomerId
              : null,

          stripeSubId:
            typeof data.stripeSubId === 'string'
              ? data.stripeSubId
              : null,

          trialEnd:
            typeof data.trialEnd === 'string'
              ? data.trialEnd
              : null,

          currentPeriodEnd:
            typeof data.currentPeriodEnd ===
            'string'
              ? data.currentPeriodEnd
              : null,

          cancelAtPeriodEnd:
            data.cancelAtPeriodEnd === true,

          cancelAt:
            typeof data.cancelAt === 'string'
              ? data.cancelAt
              : null,
        });

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

  const handleManageSubscription =
    async () => {
      try {
        setPortalLoading(true);
        setError('');

        const res = await fetch(
          '/api/stripe/portal',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            credentials: 'include',
          }
        );

        const contentType =
          res.headers.get('content-type');

        if (
          !contentType?.includes(
            'application/json'
          )
        ) {
          const text = await res.text();

          console.error(
            'Réponse portail Stripe non JSON :',
            text
          );

          throw new Error(
            'Le serveur Stripe a retourné une réponse inattendue.'
          );
        }

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Impossible d'ouvrir la gestion de l'abonnement."
          );
        }

        if (
          typeof data.url !== 'string' ||
          !data.url
        ) {
          throw new Error(
            "Stripe n'a retourné aucune URL."
          );
        }

        window.location.href = data.url;

      } catch (err) {
        console.error(
          'Erreur portail Stripe :',
          err
        );

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

  const formatDate = (
    date?: string | null
  ) => {
    if (!date) return '—';

    return new Intl.DateTimeFormat(
      'fr-CA',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    ).format(new Date(date));
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

  // ============================================================
  // ERREUR / ABSENCE DE DONNÉES
  // ============================================================

  if (!subscription) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
        }}
      >
        <p>
          Impossible de récupérer votre
          abonnement.
        </p>

        {error && (
          <p
            style={{
              color: '#c53030',
              marginTop: '10px',
            }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  // ============================================================
  // ÉTATS DE L'ABONNEMENT
  // ============================================================

  const isTrial =
    subscription.subscriptionStatus ===
    'TRIALING';

  const isPro =
    subscription.plan === 'PRO' &&
    subscription.subscriptionStatus ===
      'ACTIVE';

  const isPastDue =
    subscription.subscriptionStatus ===
    'PAST_DUE';

  const isCanceled =
    subscription.subscriptionStatus ===
    'CANCELED';

  const isPending =
    subscription.subscriptionStatus ===
    'PENDING';

  const isFree =
    subscription.plan === 'FREE' &&
    !isTrial &&
    !isPro &&
    !isPastDue &&
    !isCanceled &&
    !isPending;

  // ============================================================
  // DATE D'ANNULATION
  // ============================================================

  const cancellationDate =
    subscription.cancelAt ||
    subscription.trialEnd ||
    subscription.currentPeriodEnd;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '760px',
        margin: '0 auto',
        padding: '20px 0',
      }}
    >
      {/* ===================================================== */}
      {/* TITRE */}
      {/* ===================================================== */}

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
          Consultez et gérez votre forfait
          Québec Facture.
        </p>
      </div>

      {/* ===================================================== */}
      {/* ERREUR */}
      {/* ===================================================== */}

      {error && (
        <div
          style={{
            padding: '14px',
            marginBottom: '20px',
            backgroundColor: '#fff5f5',
            border:
              '1px solid #fed7d7',
            color: '#c53030',
            borderRadius: '8px',
          }}
        >
          {error}
        </div>
      )}

      {/* ===================================================== */}
      {/* CARTE PRINCIPALE */}
      {/* ===================================================== */}

      <div
        style={{
          backgroundColor: '#ffffff',
          border:
            '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '32px',
          boxShadow:
            '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* ================================================= */}
        {/* FREE */}
        {/* ================================================= */}

        {isFree && (
          <>
            <span
              style={{
                backgroundColor:
                  '#edf2f7',
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

            <p
              style={{
                color: '#718096',
              }}
            >
              Votre forfait gratuit est
              actif.
            </p>

            <ul
              style={{
                lineHeight: '2',
                marginTop: '25px',
              }}
            >
              <li>
                ✅ Jusqu'à 3 factures
              </li>

              <li>
                ✅ Gestion des clients
              </li>

              <li>
                ✅ Calcul TPS et TVQ
              </li>

              <li>
                ✅ Gestion de base des
                dépenses
              </li>
            </ul>

            <button
              onClick={handleChoosePlan}
              style={{
                width: '100%',
                marginTop: '25px',
                padding: '13px',
                backgroundColor:
                  '#3182ce',
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

        {/* ================================================= */}
        {/* TRIAL */}
        {/* ================================================= */}

        {isTrial && (
          <>
            <span
              style={{
                backgroundColor:
                  subscription.cancelAtPeriodEnd
                    ? '#fffaf0'
                    : '#ebf4ff',

                color:
                  subscription.cancelAtPeriodEnd
                    ? '#975a16'
                    : '#4c51bf',

                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {subscription.cancelAtPeriodEnd
                ? '⚠️ ANNULATION PROGRAMMÉE'
                : '🎁 ESSAI EN COURS'}
            </span>

            <h3
              style={{
                fontSize: '25px',
                marginTop: '18px',
                color: '#2d3748',
              }}
            >
              ⚡ Essai du Plan Professionnel
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

              <span
                style={{
                  fontSize: '14px',
                  color: '#a0aec0',
                  fontWeight: 'normal',
                }}
              >
                {' '}
                pendant l'essai
              </span>
            </div>

            <p
              style={{
                color: '#4a5568',
              }}
            >
              Vous profitez actuellement de
              toutes les fonctionnalités du
              Plan Professionnel.
            </p>

            {/* ============================================= */}
            {/* TRIAL ANNULÉ */}
            {/* ============================================= */}

            {subscription.cancelAtPeriodEnd ? (
              <div
                style={{
                  marginTop: '25px',
                  padding: '18px',
                  backgroundColor:
                    '#fffaf0',
                  border:
                    '1px solid #fbd38d',
                  borderRadius: '10px',
                  color: '#975a16',
                }}
              >
                <strong>
                  ⚠️ Annulation programmée
                </strong>

                <div
                  style={{
                    marginTop: '10px',
                  }}
                >
                  Votre essai reste actif
                  jusqu'au{' '}
                  <strong>
                    {formatDate(
                      cancellationDate
                    )}
                  </strong>
                  .
                </div>

                <div
                  style={{
                    marginTop: '8px',
                  }}
                >
                  Vous ne serez pas facturé{' '}
                  <strong>
                    15,00 $ CA
                  </strong>{' '}
                  après cette date.
                </div>

                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '13px',
                  }}
                >
                  Vous conservez toutes les
                  fonctionnalités du Plan
                  Professionnel jusqu'à la fin
                  de votre essai.
                </div>
              </div>
            ) : (
              <>
                {subscription.trialEnd && (
                  <div
                    style={{
                      marginTop: '25px',
                      padding: '18px',
                      backgroundColor:
                        '#ebf4ff',
                      border:
                        '1px solid #c3dafe',
                      borderRadius:
                        '10px',
                    }}
                  >
                    <strong>
                      Fin de l'essai :
                    </strong>{' '}
                    {formatDate(
                      subscription.trialEnd
                    )}

                    <div
                      style={{
                        marginTop: '8px',
                      }}
                    >
                      Ensuite :{' '}
                      <strong>
                        15,00 $ CA / mois
                      </strong>
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
                  Vous pouvez annuler avant la
                  fin de votre période d'essai
                  afin de ne pas être facturé.
                </p>
              </>
            )}

            <button
              onClick={
                handleManageSubscription
              }
              disabled={portalLoading}
              style={{
                width: '100%',
                marginTop: '25px',
                padding: '13px',

                backgroundColor:
                  subscription.cancelAtPeriodEnd
                    ? '#d69e2e'
                    : '#4c51bf',

                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',

                cursor: portalLoading
                  ? 'not-allowed'
                  : 'pointer',

                opacity:
                  portalLoading
                    ? 0.6
                    : 1,
              }}
            >
              {portalLoading
                ? 'Ouverture...'
                : subscription.cancelAtPeriodEnd
                  ? 'Gérer ou réactiver mon abonnement'
                  : "Gérer ou annuler l'essai"}
            </button>
          </>
        )}

        {/* ================================================= */}
        {/* PRO ACTIF */}
        {/* ================================================= */}

        {isPro && (
          <>
            <span
              style={{
                backgroundColor:
                  subscription.cancelAtPeriodEnd
                    ? '#fffaf0'
                    : '#f0fff4',

                color:
                  subscription.cancelAtPeriodEnd
                    ? '#975a16'
                    : '#276749',

                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {subscription.cancelAtPeriodEnd
                ? '⚠️ ANNULATION PROGRAMMÉE'
                : 'ABONNEMENT ACTIF'}
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

            {subscription.cancelAtPeriodEnd ? (
              <div
                style={{
                  marginTop: '20px',
                  padding: '18px',
                  backgroundColor:
                    '#fffaf0',
                  border:
                    '1px solid #fbd38d',
                  borderRadius: '10px',
                  color: '#975a16',
                }}
              >
                <strong>
                  ⚠️ Annulation programmée
                </strong>

                <div
                  style={{
                    marginTop: '10px',
                  }}
                >
                  Votre abonnement reste actif
                  jusqu'au{' '}
                  <strong>
                    {formatDate(
                      subscription.cancelAt ||
                        subscription.currentPeriodEnd
                    )}
                  </strong>
                  .
                </div>

                <div
                  style={{
                    marginTop: '8px',
                  }}
                >
                  Aucun nouveau prélèvement ne
                  sera effectué après cette
                  date.
                </div>
              </div>
            ) : (
              <>
                <p
                  style={{
                    color: '#4a5568',
                  }}
                >
                  Votre abonnement
                  Professionnel est actif.
                </p>

                {subscription.currentPeriodEnd && (
                  <div
                    style={{
                      marginTop: '25px',
                      padding: '18px',
                      backgroundColor:
                        '#f7fafc',
                      borderRadius:
                        '10px',
                    }}
                  >
                    <strong>
                      Prochain
                      renouvellement :
                    </strong>{' '}
                    {formatDate(
                      subscription.currentPeriodEnd
                    )}
                  </div>
                )}
              </>
            )}

            <button
              onClick={
                handleManageSubscription
              }
              disabled={portalLoading}
              style={{
                width: '100%',
                marginTop: '25px',
                padding: '13px',

                backgroundColor:
                  subscription.cancelAtPeriodEnd
                    ? '#d69e2e'
                    : '#38a169',

                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',

                cursor: portalLoading
                  ? 'not-allowed'
                  : 'pointer',

                opacity:
                  portalLoading
                    ? 0.6
                    : 1,
              }}
            >
              {portalLoading
                ? 'Ouverture...'
                : subscription.cancelAtPeriodEnd
                  ? 'Gérer ou réactiver mon abonnement'
                  : "Gérer l'abonnement"}
            </button>
          </>
        )}

        {/* ================================================= */}
        {/* PAST DUE */}
        {/* ================================================= */}

        {isPastDue && (
          <>
            <span
              style={{
                backgroundColor:
                  '#fff5f5',
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
              Un problème est survenu avec
              votre dernier paiement.
            </p>

            <button
              onClick={
                handleManageSubscription
              }
              disabled={portalLoading}
              style={{
                width: '100%',
                marginTop: '25px',
                padding: '13px',
                backgroundColor:
                  '#c53030',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',

                cursor: portalLoading
                  ? 'not-allowed'
                  : 'pointer',

                opacity:
                  portalLoading
                    ? 0.6
                    : 1,
              }}
            >
              {portalLoading
                ? 'Ouverture...'
                : 'Régulariser mon abonnement'}
            </button>
          </>
        )}

        {/* ================================================= */}
        {/* PENDING */}
        {/* ================================================= */}

        {isPending && (
          <>
            <span
              style={{
                backgroundColor:
                  '#fffaf0',
                color: '#975a16',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              ABONNEMENT EN ATTENTE
            </span>

            <h3
              style={{
                marginTop: '18px',
                fontSize: '25px',
                color: '#2d3748',
              }}
            >
              Plan Professionnel
            </h3>

            <p
              style={{
                marginTop: '20px',
                color: '#718096',
              }}
            >
              Votre abonnement est en cours
              de traitement.
            </p>
          </>
        )}

        {/* ================================================= */}
        {/* CANCELED */}
        {/* ================================================= */}

        {isCanceled && (
          <>
            <span
              style={{
                backgroundColor:
                  '#edf2f7',
                color: '#4a5568',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              ABONNEMENT TERMINÉ
            </span>

            <h3
              style={{
                marginTop: '18px',
                fontSize: '25px',
                color: '#2d3748',
              }}
            >
              Abonnement Professionnel terminé
            </h3>

            <p
              style={{
                marginTop: '20px',
                color: '#718096',
              }}
            >
              Votre abonnement Professionnel
              n'est plus actif.
            </p>

            <button
              onClick={handleChoosePlan}
              style={{
                width: '100%',
                marginTop: '25px',
                padding: '13px',
                backgroundColor:
                  '#3182ce',
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
      </div>
    </div>
  );
}