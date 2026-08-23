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
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-7xl">

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Choisissez votre forfait 🚀
          </h1>

          <p className="mt-3 text-gray-600">
            Commencez gratuitement, testez le forfait Pro pendant 3 jours
            ou abonnez-vous immédiatement.
          </p>
        </div>

        {error && (
          <div className="max-w-xl mx-auto mb-6 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* FREE */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 flex flex-col">

            <div className="mb-6">
              <span className="inline-block px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
                GRATUIT
              </span>

              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                Plan Free
              </h2>

              <div className="mt-4 flex items-end gap-2">
                <span className="text-4xl font-bold text-gray-900">
                  0,00 $
                </span>

                <span className="text-gray-500 mb-1">
                  / mois
                </span>
              </div>

              <p className="mt-3 text-sm text-gray-500">
                Gratuit en permanence.
              </p>
            </div>

            <ul className="space-y-3 text-gray-700 mb-8 flex-1">
              <li>✅ Jusqu'à 3 factures</li>
              <li>✅ Gestion des clients</li>
              <li>✅ Calcul TPS et TVQ</li>
              <li>✅ Gestion de base des dépenses</li>
              <li>✅ Accès au tableau de bord</li>
            </ul>

            <button
              type="button"
              onClick={chooseFreePlan}
              className="w-full py-3 px-4 rounded-lg border border-gray-300 bg-white text-gray-800 font-semibold hover:bg-gray-50 transition"
            >
              Continuer gratuitement
            </button>
          </div>

          {/* ESSAI 3 JOURS */}
          <div className="bg-white border-2 border-indigo-500 rounded-2xl shadow-lg p-8 flex flex-col relative">

            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 text-xs font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 rounded-full">
                ESSAI GRATUIT
              </span>
            </div>

            <div className="mb-6">
              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Essai Pro
              </h2>

              <div className="mt-4">
                <span className="text-4xl font-bold text-indigo-600">
                  0,00 $
                </span>

                <p className="mt-1 text-sm text-gray-500">
                  pendant 3 jours
                </p>
              </div>

              <div className="mt-5 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <p className="font-semibold text-indigo-800">
                  🎁 Accès complet au Plan Pro pendant 3 jours
                </p>

                <p className="mt-2 text-sm text-indigo-700">
                  Carte requise, mais aucun prélèvement immédiat.
                </p>

                <p className="mt-1 text-sm text-indigo-700">
                  Puis 15,00 $ CA/mois après 3 jours si vous n'annulez pas.
                </p>
              </div>
            </div>

            <ul className="space-y-3 text-gray-700 mb-8 flex-1">
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
              className="w-full py-3 px-4 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPlan === 'trial'
                ? 'Redirection vers Stripe...'
                : "Commencer l'essai gratuit"}
            </button>

            <p className="mt-3 text-center text-xs text-gray-500">
              Annulez avant la fin des 3 jours pour ne rien payer.
            </p>
          </div>

          {/* PRO IMMÉDIAT */}
          <div className="bg-white border-2 border-blue-600 rounded-2xl shadow-lg p-8 flex flex-col relative">

            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 text-xs font-bold text-blue-700 bg-blue-100 border border-blue-200 rounded-full">
                PROFESSIONNEL
              </span>
            </div>

            <div className="mb-6">
              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Plan Professionnel
              </h2>

              <div className="mt-4 flex items-end gap-2">
                <span className="text-4xl font-bold text-blue-600">
                  15,00 $
                </span>

                <span className="text-gray-500 mb-1">
                  / mois
                </span>
              </div>

              <p className="mt-3 text-sm text-gray-500">
                Abonnement immédiat, sans période d'essai.
              </p>
            </div>

            <ul className="space-y-3 text-gray-700 mb-8 flex-1">
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
              className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPlan === 'pro'
                ? 'Redirection vers Stripe...'
                : 'Choisir le Plan Professionnel'}
            </button>

            <p className="mt-3 text-center text-xs text-gray-500">
              15,00 $ CA facturés immédiatement, puis chaque mois.
            </p>
          </div>

        </div>

        <p className="text-center mt-8 text-sm text-gray-500">
          Vous pourrez gérer ou annuler votre abonnement depuis votre tableau de bord.
        </p>

      </div>
    </main>
  );
}