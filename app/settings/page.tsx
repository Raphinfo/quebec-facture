'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    tpsNumber: '',
    tvqNumber: '',
    companyLogo: '',
    subscriptionStatus: 'ACTIVE',
  });

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          companyName: data.companyName || '',
          companyAddress: data.companyAddress || '',
          tpsNumber: data.tpsNumber || '',
          tvqNumber: data.tvqNumber || '',
          companyLogo: data.companyLogo || '',
          subscriptionStatus: data.subscriptionStatus || 'ACTIVE',
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur chargement profil:", err);
        setLoading(false);
      });
  }, []);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: '⚠️ L\'image est trop lourde (max 2 Mo).' });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, companyLogo: reader.result as string }));
        setMessage({ type: '', text: '' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '✅ Paramètres enregistrés avec succès !' });
      } else {
        const errorData = await res.json();
        setMessage({ type: 'error', text: `❌ ${errorData.error || 'Erreur lors de la sauvegarde.'}` });
      }
    } catch {
      setMessage({ type: 'error', text: '❌ Erreur réseau ou serveur.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
        Chargement de vos paramètres...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">⚙️ Profil & Entreprise</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                Plan {formData.subscriptionStatus}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Ces informations alimentent automatiquement vos factures officielles.</p>
          </div>

         <Link 
        href="/dashboard" 
        className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm"
        >
        ← Retour au Dashboard
        </Link>
        </div>

        {message.text && (
          <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nom Légal de l'Entreprise</label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
              placeholder="Ex: Informatique Matane inc."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse Complète</label>
            <input
              type="text"
              required
              value={formData.companyAddress}
              onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
              placeholder="Ex: 280 Rue Jacques-Cartier, Matane, QC G4W 2W5"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Numéro de TPS (ARC)</label>
              <input
                type="text"
                value={formData.tpsNumber}
                onChange={(e) => setFormData({ ...formData, tpsNumber: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 uppercase"
                placeholder="Ex: 123456789RT0001"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Numéro de TVQ (Revenu Québec)</label>
              <input
                type="text"
                value={formData.tvqNumber}
                onChange={(e) => setFormData({ ...formData, tvqNumber: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 uppercase"
                placeholder="Ex: 1234567890TQ0001"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Logo de la Facture</label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <span className="block text-xs text-gray-500 mb-1">Télécharger depuis votre appareil :</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer"
                />
              </div>

              <div>
                <span className="block text-xs text-gray-500 mb-1">Ou indiquer une URL d'image :</span>
                <input
                  type="url"
                  value={formData.companyLogo}
                  onChange={(e) => setFormData({ ...formData, companyLogo: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm text-gray-800"
                  placeholder="https://..."
                />
              </div>
            </div>

            {formData.companyLogo && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-gray-500 block">Aperçu du rendu :</span>
                  <img src={formData.companyLogo} alt="Logo Entreprise" className="h-12 max-w-[180px] object-contain mt-1" />
                </div>
               <button
                type="button"
                onClick={() => setFormData({ ...formData, companyLogo: '' })}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition"
                >
                Supprimer
                </button>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Enregistrer le Profil'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}