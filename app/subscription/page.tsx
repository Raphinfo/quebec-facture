'use client';

import React from 'react';

export default function SubscriptionTab() {
  const handleSubscribePro = async () => {
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url; // Redirection vers Stripe Checkout
      } else {
        alert(data.error || "Erreur lors de l'initialisation du paiement Stripe.");
      }
    } catch (err) {
      console.error("Erreur Checkout:", err);
      alert("Impossible de contacter le service de paiement.");
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '20px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '26px', color: '#2d3748', marginBottom: '10px' }}>
          Choisissez votre forfait 🚀
        </h2>
        <p style={{ color: '#718096', fontSize: '14px' }}>
          Gérez vos factures et vos dépenses en toute conformité avec la Loi 25 au Québec.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
        
        {/* CARTE 1 : PLAN ESSAI GRATUIT */}
        <div style={{
          flex: '1',
          minWidth: '280px',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e0',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <span style={{ backgroundColor: '#edf2f7', color: '#4a5568', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            GRATUIT
          </span>
          <h3 style={{ fontSize: '22px', margin: '15px 0 10px 0', color: '#2d3748' }}>Essai Découverte</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a202c', marginBottom: '20px' }}>
            0,00 $ <span style={{ fontSize: '14px', color: '#a0aec0', fontWeight: 'normal' }}>/ mois</span>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px 0', fontSize: '14px', color: '#4a5568', lineHeight: '2' }}>
            <li>✅ <strong>Jusqu'à 3 factures</strong> émanantes</li>
            <li>✅ Gestion des clients & NEQ</li>
            <li>✅ Calcul TPS (5 %) & TVQ (9.975 %)</li>
            <li>✅ Module de dépenses de base</li>
            <li>❌ Export PDF avancé</li>
          </ul>

          <button 
            disabled
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#e2e8f0',
              color: '#718096',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'not-allowed'
            }}
          >
            Plan Actuel
          </button>
        </div>

        {/* CARTE 2 : PLAN PRO (AVEC BOUTON VISIBLE) */}
        <div style={{
          flex: '1',
          minWidth: '280px',
          backgroundColor: '#ffffff',
          border: '2px solid #3182ce',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 10px 15px -3px rgba(49, 130, 206, 0.1)'
        }}>
          <span style={{ backgroundColor: '#ebf8ff', color: '#3182ce', border: '1px solid #bee3f8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            RECOMMANDÉ
          </span>
          <h3 style={{ fontSize: '22px', margin: '15px 0 10px 0', color: '#2d3748' }}>Plan Professionnel</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2b6cb0', marginBottom: '20px' }}>
            15 $ <span style={{ fontSize: '14px', color: '#a0aec0', fontWeight: 'normal' }}>/ mois</span>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px 0', fontSize: '14px', color: '#4a5568', lineHeight: '2' }}>
            <li>⚡ <strong>Factures Illimitées</strong></li>
            <li>⚡ Gestion complète des clients & NEQ</li>
            <li>⚡ Suivi automatique du Revenu Net Réel</li>
            <li>⚡ Historique complet des dépenses</li>
            <li>⚡ Support prioritaire Loi 25</li>
          </ul>

          <button 
            onClick={handleSubscribePro}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#3182ce',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(49, 130, 206, 0.2)'
            }}
          >
            Passer au Plan Pro (15 $)
          </button>
        </div>

      </div>
    </div>
  );
}