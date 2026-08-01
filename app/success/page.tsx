import Link from 'next/link';

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50 text-center">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-xl shadow-md border border-gray-100">
        <div className="text-5xl">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900">Merci pour votre abonnement !</h1>
        <p className="text-gray-600">
          Votre paiement a été traité avec succès. Vous avez maintenant un accès complet pour gérer vos factures.
        </p>
        <div className="pt-4">
          <Link 
            href="/dashboard" 
            className="inline-block py-2 px-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow transition"
          >
            Aller au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}