'use client';

import { useState } from 'react';

export default function ChoosePlanPage() {
  const [loadingPlan, setLoadingPlan] = useState<
    'trial' | 'pro' | null
  >(null);

  const [error, setError] = useState('');

  const chooseFreePlan = () => {
    window.location.href = '/dashboard';
  };

  const startCheckout = async (trial: boolean) => {
    setError('');
    setLoadingPlan(trial ? 'trial' : 'pro');

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trial,
        }),
      });

      const contentType = res.headers.get('content-type');

      if (!contentType?.includes('application/json')) {
        const text = await res.text();

        console.error('Réponse Stripe non JSON :', text);

        throw new Error(
          'Le serveur a retourné une réponse inattendue.'
        );
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Impossible d'ouvrir le paiement Stripe."
        );
      }

      if (!data.url) {
        throw new Error(
          "Stripe n'a retourné aucune URL de paiement."
        );
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Une erreur inattendue est survenue.');
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        padding: '42px 24px 48px',
        transition:
          'background-color 0.25s ease, color 0.25s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
        }}
      >
        {/* EN-TÊTE */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          <h1
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'var(--foreground)',
              marginTop: 0,
              marginBottom: '12px',
            }}
          >
            Choisissez votre forfait 🚀
          </h1>

          <p
            style={{
              marginTop: 0,
              marginBottom: 0,
              color: 'var(--text-muted)',
              fontSize: '16px',
            }}
          >
            Commencez gratuitement, testez le forfait Pro pendant 3 jours
            ou abonnez-vous immédiatement.
          </p>
        </div>

        {/* ERREUR */}
        {error && (
          <div
            style={{
              maxWidth: '600px',
              margin: '0 auto 24px auto',
              padding: '16px',
              fontSize: '14px',
              color: 'var(--danger)',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--danger)',
              borderRadius: '8px',
            }}
          >
            {error}
          </div>
        )}

        {/* CARTES */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px',
            alignItems: 'stretch',
          }}
        >
          {/* FREE */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  backgroundColor: 'var(--surface-soft)',
                  border: '1px solid var(--border)',
                  borderRadius: '999px',
                }}
              >
                GRATUIT
              </span>

              <h2
                style={{
                  marginTop: '16px',
                  marginBottom: 0,
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--foreground)',
                }}
              >
                Plan Free
              </h2>

              <div
                style={{
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 700,
                    color: 'var(--foreground)',
                  }}
                >
                  0,00 $
                </span>

                <span
                  style={{
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  / mois
                </span>
              </div>

              <p
                style={{
                  marginTop: '12px',
                  marginBottom: 0,
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                }}
              >
                Gratuit en permanence.
              </p>
            </div>

            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                color: 'var(--foreground)',
                marginTop: 0,
                marginBottom: '32px',
                flexGrow: 1,
                paddingLeft: 0,
                listStyle: 'none',
              }}
            >
              <li>✅ Jusqu'à 3 factures</li>
              <li>✅ Gestion des clients</li>
              <li>✅ Calcul TPS et TVQ</li>
              <li>✅ Gestion de base des dépenses</li>
              <li>✅ Accès au tableau de bord</li>
            </ul>

            <button
              type="button"
              onClick={chooseFreePlan}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-soft)',
                color: 'var(--foreground)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Continuer gratuitement
            </button>
          </div>

          {/* ESSAI PRO */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
              border: '2px solid #8b5cf6',
              borderRadius: '16px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-13px',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#c4b5fd',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid #8b5cf6',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                }}
              >
                ESSAI GRATUIT
              </span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  marginTop: '8px',
                  marginBottom: 0,
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--foreground)',
                }}
              >
                Essai Pro
              </h2>

              <div style={{ marginTop: '16px' }}>
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 700,
                    color: '#a78bfa',
                  }}
                >
                  0,00 $
                </span>

                <p
                  style={{
                    marginTop: '4px',
                    marginBottom: 0,
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                  }}
                >
                  pendant 3 jours
                </p>
              </div>

              <div
                style={{
                  marginTop: '20px',
                  padding: '16px',
                  backgroundColor: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid #8b5cf6',
                  borderRadius: '12px',
                }}
              >
                <p
                  style={{
                    fontWeight: 600,
                    color: '#c4b5fd',
                    margin: 0,
                  }}
                >
                  🎁 Accès complet au Plan Pro pendant 3 jours
                </p>

                <p
                  style={{
                    marginTop: '8px',
                    marginBottom: 0,
                    fontSize: '14px',
                    color: '#a78bfa',
                  }}
                >
                  Carte requise, mais aucun prélèvement immédiat.
                </p>

                <p
                  style={{
                    marginTop: '4px',
                    marginBottom: 0,
                    fontSize: '14px',
                    color: '#a78bfa',
                  }}
                >
                  Puis 15,00 $ CA/mois après 3 jours si vous n'annulez pas.
                </p>
              </div>
            </div>

            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                color: 'var(--foreground)',
                marginTop: 0,
                marginBottom: '32px',
                flexGrow: 1,
                paddingLeft: 0,
                listStyle: 'none',
              }}
            >
              <li>⚡ Factures illimitées</li>
              <li>⚡ Gestion complète des clients</li>
              <li>⚡ Calcul TPS et TVQ</li>
              <li>⚡ Gestion avancée des dépenses</li>
              <li>⚡ Suivi du revenu net</li>
              <li>⚡ Fonctions professionnelles</li>
              <li>⚡ Support prioritaire</li>
            </ul>

            <button
              type="button"
              onClick={() => startCheckout(true)}
              disabled={loadingPlan !== null}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#8b5cf6',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                cursor:
                  loadingPlan !== null ? 'not-allowed' : 'pointer',
                opacity: loadingPlan !== null ? 0.5 : 1,
              }}
            >
              {loadingPlan === 'trial'
                ? 'Redirection vers Stripe...'
                : "Commencer l'essai gratuit"}
            </button>

            <p
              style={{
                marginTop: '12px',
                marginBottom: 0,
                textAlign: 'center',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              Annulez avant la fin des 3 jours pour ne rien payer.
            </p>
          </div>

          {/* PLAN PROFESSIONNEL */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
              border: '2px solid var(--primary)',
              borderRadius: '16px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-13px',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--primary)',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                }}
              >
                PROFESSIONNEL
              </span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  marginTop: '8px',
                  marginBottom: 0,
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--foreground)',
                }}
              >
                Plan Professionnel
              </h2>

              <div
                style={{
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 700,
                    color: 'var(--primary)',
                  }}
                >
                  15,00 $
                </span>

                <span
                  style={{
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  / mois
                </span>
              </div>

              <p
                style={{
                  marginTop: '12px',
                  marginBottom: 0,
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                }}
              >
                Abonnement immédiat, sans période d'essai.
              </p>
            </div>

            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                color: 'var(--foreground)',
                marginTop: 0,
                marginBottom: '32px',
                flexGrow: 1,
                paddingLeft: 0,
                listStyle: 'none',
              }}
            >
              <li>⚡ Factures illimitées</li>
              <li>⚡ Gestion complète des clients</li>
              <li>⚡ Calcul TPS et TVQ</li>
              <li>⚡ Gestion avancée des dépenses</li>
              <li>⚡ Suivi du revenu net</li>
              <li>⚡ Fonctions professionnelles</li>
              <li>⚡ Support prioritaire</li>
            </ul>

            <button
              type="button"
              onClick={() => startCheckout(false)}
              disabled={loadingPlan !== null}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                cursor:
                  loadingPlan !== null ? 'not-allowed' : 'pointer',
                opacity: loadingPlan !== null ? 0.5 : 1,
              }}
            >
              {loadingPlan === 'pro'
                ? 'Redirection vers Stripe...'
                : 'Choisir le Plan Professionnel'}
            </button>

            <p
              style={{
                marginTop: '12px',
                marginBottom: 0,
                textAlign: 'center',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              15,00 $ CA facturés immédiatement, puis chaque mois.
            </p>
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            marginTop: '28px',
            marginBottom: 0,
            fontSize: '14px',
            color: 'var(--text-muted)',
          }}
        >
          Vous pourrez gérer ou annuler votre abonnement depuis votre
          tableau de bord.
        </p>
      </div>
    </main>
  );
}