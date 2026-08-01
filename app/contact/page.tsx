"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "support",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    // Simulation d'envoi / Intégration API
    try {
      // Tu pourras relier cette partie à une route API si tu souhaites recevoir les messages par courriel
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus("success");
      setFormData({ name: "", email: "", subject: "support", message: "" });
    } catch (error) {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* En-tête */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Contactez l'équipe Québec Facture 📬
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Une question sur votre abonnement, une suggestion ou un besoin d'assistance ? Nous sommes là pour vous aider.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Bloc Coordonnées & Support */}
          <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Informations</h2>
              
              <div className="space-y-4 text-sm text-slate-600">
                <div>
                  <strong className="block text-slate-900">📍 Localisation :</strong>
                  <span>Matane, Québec, Canada</span>
                </div>

                <div>
                  <strong className="block text-slate-900">✉️ Courriel du support :</strong>
                  <a href="mailto:support@quebecfacture.com" className="text-blue-600 hover:underline">
                    support@quebecfacture.com
                  </a>
                </div>

                <div>
                  <strong className="block text-slate-900">⏱️ Heures d'ouverture :</strong>
                  <span>Lundi - Vendredi : 9h00 à 17h00 (EST)</span>
                </div>
              </div>
            </div>

            {/* Note Conformité Loi 25 */}
            <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <strong className="text-slate-700 block mb-1">🔒 Confidentialité (Loi 25) :</strong>
              Vos données transmises via ce formulaire sont strictement utilisées pour répondre à votre demande.
            </div>
          </div>

          {/* Formulaire de Contact */}
          <div className="md:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            {status === "success" && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm">
                ✅ Merci ! Votre message a bien été envoyé. Notre équipe vous répondra dans les plus brefs délais.
              </div>
            )}

            {status === "error" && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm">
                ❌ Une erreur est survenue lors de l'envoi. Veuillez réessayer ou envoyer un courriel direct.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Nom complet *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Jean Tremblay"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Adresse courriel *
                </label>
                <input
                  type="email"
                  required
                  placeholder="nom@entreprise.ca"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Sujet *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition"
                >
                  <option value="support">Support technique</option>
                  <option value="billing">Facturation & Abonnement</option>
                  <option value="feedback">Suggestion / Amélioration</option>
                  <option value="other">Autre demande</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Message *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Décrivez clairement votre demande..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition duration-200 disabled:opacity-50"
              >
                {status === "loading" ? "Envoi en cours..." : "Envoyer le message"}
              </button>
            </form>
          </div>

        </div>

        {/* Pied de page de retour */}
        <div className="mt-10 text-center text-sm text-slate-500">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Retour au Tableau de Bord
          </Link>
        </div>

      </div>
    </div>
  );
}