'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Équipement');
  const [amount, setAmount] = useState('');

  // 1. Charger la liste des dépenses
  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erreur chargement dépenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // 2. Ajouter une dépense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, category, amount }),
      });

      if (res.ok) {
        setDescription('');
        setAmount('');
        setMessage({ type: 'success', text: '✅ Dépense enregistrée !' });
        fetchExpenses();
      } else {
        const errorData = await res.json();
        setMessage({ type: 'error', text: `❌ ${errorData.error || 'Erreur lors de l\'ajout.'}` });
      }
    } catch {
      setMessage({ type: 'error', text: '❌ Erreur réseau.' });
    } finally {
      setSaving(false);
    }
  };

  // 3. Supprimer une dépense
  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette dépense ?")) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExpenses();
      } else {
        alert("Erreur lors de la suppression de la dépense.");
      }
    } catch (err) {
      console.error("Erreur suppression dépense :", err);
    }
  };

  // Calcul du total des dépenses
  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* En-tête */}
        <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">💸 Gestion des Dépenses</h1>
            <p className="text-sm text-gray-500">Inscrivez vos achats pour déduire vos dépenses du Revenu Net Réel.</p>
          </div>
          <Link 
            href="/dashboard" 
            className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm"
          >
            ← Retour au Dashboard
          </Link>
        </div>

        {/* Message de notification */}
        {message.text && (
          <div className={`p-4 rounded-lg text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Formulaire d'ajout */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm md:col-span-1">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Ajouter une dépense</h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  placeholder="Ex: Achat ordinateur, Logiciel..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                >
                  <option value="Équipement">Équipement</option>
                  <option value="Logiciel / Abonnements">Logiciel / Abonnements</option>
                  <option value="Fournitures de bureau">Fournitures de bureau</option>
                  <option value="Services professionnels">Services professionnels</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Montant ($ CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  placeholder="0.00"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition disabled:opacity-50 mt-2 shadow-sm"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer la dépense'}
              </button>
            </form>
          </div>

          {/* Table de l'historique */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Historique des achats</h2>
              <span className="text-sm font-black text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                Total: {totalExpenses.toFixed(2)} $
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">Chargement des dépenses...</p>
            ) : expenses.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucune dépense enregistrée pour le moment.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
                      <th className="py-2">Description</th>
                      <th className="py-2">Catégorie</th>
                      <th className="py-2">Date</th>
                      <th className="py-2 text-right">Montant</th>
                      <th className="py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 font-semibold text-gray-800">{exp.description}</td>
                        <td className="py-3 text-xs text-gray-500">{exp.category}</td>
                        <td className="py-3 text-xs text-gray-400">
                          {new Date(exp.createdAt || Date.now()).toLocaleDateString('fr-CA')}
                        </td>
                        <td className="py-3 text-right font-bold text-red-600">
                          {Number(exp.amount).toFixed(2)} $
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}