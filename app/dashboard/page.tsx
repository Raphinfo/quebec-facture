'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import QuotesSection from "@/components/QuotesSection";



interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  createdAt: string;
}

type ActiveTab =
  | 'billing'
  | 'quotes'
  | 'profile'
  | 'privacy'
  | 'expenses'
  | 'subscription'
  | 'settings';

type SubscriptionStatus =
  | 'PENDING'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED';

function DashboardContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // ============================================================
  // NAVIGATION
  // ============================================================
const [activeTab, setActiveTab] =
  useState<ActiveTab>('billing');

useEffect(() => {
  switch (tabParam) {
    case 'billing':
      setActiveTab('billing');
      break;

    case 'company':
    case 'profile':
      setActiveTab('profile');
      break;

    case 'quotes':
      setActiveTab('quotes');
      break;

    case 'expenses':
      setActiveTab('expenses');
      break;

    case 'privacy':
      setActiveTab('privacy');
      break;

    case 'subscription':
      setActiveTab('subscription');
      break;

    case 'settings':
      setActiveTab('settings');
      break;

    default:
      setActiveTab('billing');
  }
}, [tabParam]);

// Recharge les factures chaque fois qu'on revient sur Facturation
useEffect(() => {
  if (activeTab === 'billing') {
    fetchInvoices();
  }
}, [activeTab]);

  // ============================================================
  // AUTHENTIFICATION
  // ============================================================

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // ============================================================
  // DONNÉES PRINCIPALES
  // ============================================================

  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // ============================================================
  // ABONNEMENT
  // ============================================================

  const [userPlan, setUserPlan] =
    useState<'FREE' | 'PRO'>('FREE');

  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>('ACTIVE');

  const [trialEnd, setTrialEnd] =
    useState<string | null>(null);

  const [currentPeriodEnd, setCurrentPeriodEnd] =
    useState<string | null>(null);

  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] =
    useState(false);

  const [cancelAt, setCancelAt] =
    useState<string | null>(null);

  const [stripeCustomerId, setStripeCustomerId] =
    useState<string | null>(null);

  const [loadingSubscription, setLoadingSubscription] =
    useState(false);

  const [subscriptionError, setSubscriptionError] =
    useState('');

  // ============================================================
  // CHARGER L'ABONNEMENT
  // ============================================================

  const fetchSubscription = async () => {
  try {
    setLoadingSubscription(true);
    setSubscriptionError('');

    const res = await fetch('/api/stripe/subscription', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
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
          "Impossible de récupérer les informations d'abonnement."
      );
    }

    console.log('ABONNEMENT REÇU :', data);

    setUserPlan(
      data.plan === 'PRO'
        ? 'PRO'
        : 'FREE'
    );

    const validStatuses: SubscriptionStatus[] = [
      'PENDING',
      'TRIALING',
      'ACTIVE',
      'PAST_DUE',
      'CANCELED',
    ];

    const status: SubscriptionStatus =
      validStatuses.includes(data.subscriptionStatus)
        ? data.subscriptionStatus
        : 'ACTIVE';

    setSubscriptionStatus(status);

    setTrialEnd(
      typeof data.trialEnd === 'string'
        ? data.trialEnd
        : null
    );

    setCurrentPeriodEnd(
      typeof data.currentPeriodEnd === 'string'
        ? data.currentPeriodEnd
        : null
    );

    setCancelAtPeriodEnd(
      data.cancelAtPeriodEnd === true
    );

    setCancelAt(
      typeof data.cancelAt === 'string'
        ? data.cancelAt
        : null
    );

    setStripeCustomerId(
      typeof data.stripeCustomerId === 'string'
        ? data.stripeCustomerId
        : null
    );

  } catch (error) {
    console.error(
      'Erreur récupération abonnement :',
      error
    );

    setSubscriptionError(
      error instanceof Error
        ? error.message
        : "Impossible de récupérer votre abonnement."
    );

  } finally {
    setLoadingSubscription(false);
  }
};

// ============================================================
// CHARGER L'ABONNEMENT APRÈS AUTHENTIFICATION
// ============================================================

useEffect(() => {
  if (!authorized) return;

  fetchSubscription();
}, [authorized]);

// ============================================================
// VOIR LES OPTIONS DE FORFAIT
// ============================================================

const handleChoosePlan = () => {
  window.location.href = '/choose-plan';
};

  // ============================================================
  // OUVRIR LE PORTAIL STRIPE
  // ============================================================

  const handleOpenStripePortal = async () => {
    try {
      setSubscriptionError('');

      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type');

      if (!contentType?.includes('application/json')) {
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
            "Impossible d'ouvrir le portail Stripe."
        );
      }

      if (!data.url) {
        throw new Error(
          "Stripe n'a retourné aucune URL."
        );
      }

      window.location.href = data.url;

    } catch (error) {
      console.error(
        'Erreur portail Stripe :',
        error
      );

      setSubscriptionError(
        error instanceof Error
          ? error.message
          : "Impossible d'ouvrir la gestion de l'abonnement."
      );
    }
  };
  // Dépenses
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Équipement');
  const [expenseMessage, setExpenseMessage] = useState('');
  const [expenseError, setExpenseError] = useState('');

  // Profil émetteur (Données de l'entreprise)
  const [userProfile, setUserProfile] = useState<any>({
    companyName: '',
    companyAddress: '',
    tpsNumber: '',
    tvqNumber: '',
    companyLogo: ''
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // Formulaire client
  const [name, setName] = useState('');
  const [companyNameField, setCompanyNameField] = useState('');
  const [neq, setNeq] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Lignes de services pour la facture
  const [invoiceItems, setInvoiceItems] = useState<{ description: string; amount: string }[]>([
    { description: '', amount: '' }
  ]);

  const [selectedClientId, setSelectedClientId] = useState('');

  // Messages d'état
  const [clientMessage, setClientMessage] = useState('');
  const [clientError, setClientError] = useState('');
  const [invoiceMessage, setInvoiceMessage] = useState('');
  const [invoiceError, setInvoiceError] = useState('');
  const [loadingClient, setLoadingClient] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // Charger le profil
  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        if (data) setUserProfile(data);
      }
    } catch (err) { console.error("Erreur profil:", err); }
  };

  // Charger les clients
  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) setClients(await response.json());
    } catch (err) { console.error(err); }
  };

  // Charger les factures
  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        const formattedInvoices = data.map((inv: any) => ({
          ...inv,
          amountSubtotal: Number(inv.amountSubtotal) || 0,
          tpsAmount: Number(inv.tpsAmount) || 0,
          tvqAmount: Number(inv.tvqAmount) || 0,
          amountTotal: Number(inv.amountTotal) || 0,
          items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items
        }));
        setInvoices(formattedInvoices);
      }
    } catch (err) {
      console.error("Erreur chargement factures :", err);
    }
  };

  // Charger les dépenses
  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) setExpenses(await res.json());
    } catch (err) {
      console.error("Erreur chargement dépenses", err);
    }
  };

  // Ajouter une dépense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseMessage('');
    setExpenseError('');

    if (!expenseDesc || !expenseAmount) {
      setExpenseError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: expenseDesc,
          amount: parseFloat(expenseAmount),
          category: expenseCategory
        })
      });

      if (res.ok) {
        setExpenseMessage('Dépense ajoutée avec succès !');
        setExpenseDesc('');
        setExpenseAmount('');
        fetchExpenses();
      } else {
        const data = await res.json();
        setExpenseError(data.error || 'Une erreur est survenue.');
      }
    } catch (err) {
      setExpenseError('Impossible de contacter le serveur.');
    }
  };

  // Supprimer une dépense
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette dépense ?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) fetchExpenses();
    } catch (err) {
      console.error("Erreur suppression dépense", err);
    }
  };


  // Vérification de session
 useEffect(() => {
  const verifySession = async () => {
    try {
      const profileRes = await fetch('/api/profile', {
        method: 'GET',
        credentials: 'include',
      });

      if (profileRes.status === 401) {
        setAuthorized(false);
        return;
      }

      if (!profileRes.ok) {
        setAuthorized(false);
        return;
      }

      const profile = await profileRes.json();

      // L'utilisateur est connecté.
      // Son abonnement ne détermine PAS son authentification.
      setAuthorized(true);

      setUserPlan(profile.plan || 'FREE');

      setUserProfile({
        companyName: profile.companyName || '',
        companyAddress: profile.companyAddress || '',
        tpsNumber: profile.tpsNumber || '',
        tvqNumber: profile.tvqNumber || '',
        companyLogo: profile.companyLogo || '',
      });

      await Promise.all([
        fetchClients(),
        fetchInvoices(),
        fetchExpenses(),
      ]);

    } catch (error) {
      console.error('Erreur vérification session :', error);
      setAuthorized(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  verifySession();
}, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Le fichier original est trop volumineux (max 2 Mo).");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const scaleFactor = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/png');
            setUserProfile((prev: any) => ({ ...prev, companyLogo: compressedBase64 }));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.companyName?.trim()) {
      setProfileMessage('⚠️ Veuillez inscrire le nom de votre entreprise.');
      return;
    }
    if (userProfile.companyName.trim().length < 3) {
      setProfileMessage('⚠️ Le nom de l\'entreprise doit contenir un minimum de 3 caractères.');
      return;
    }
    if (!userProfile.companyAddress?.trim()) {
      setProfileMessage('⚠️ Veuillez renseigner une adresse d\'affaires complète.');
      return;
    }
    if (userProfile.companyAddress.trim().length < 10) {
      setProfileMessage('⚠️ Veuillez renseigner une adresse d\'affaires plus complète.');
      return;
    }
    if (!userProfile.tpsNumber?.trim() || !userProfile.tvqNumber?.trim()) {
      setProfileMessage('⚠️ Veuillez inscrire vos numéros de TPS et TVQ.');
      return;
    }

    const cleanTps = userProfile.tpsNumber.replace(/[\s-]/g, '').toUpperCase();
    const cleanTvq = userProfile.tvqNumber.replace(/[\s-]/g, '').toUpperCase();

    if (!/^\d{9}RT\d{4}$/.test(cleanTps)) {
      setProfileMessage('⚠️ Le numéro de TPS doit ressembler à : 123456789RT0001.');
      return;
    }
    if (!/^\d{10}TQ\d{4}$/.test(cleanTvq)) {
      setProfileMessage('⚠️ Le numéro de TVQ doit ressembler à : 1234567890TQ0001.');
      return;
    }

    setProfileMessage('');
    setLoadingProfile(true);

    const cleanedProfile = { ...userProfile, tpsNumber: cleanTps, tvqNumber: cleanTvq };

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedProfile),
      });
      if (response.ok) {
        setProfileMessage('✅ Profil d\'entreprise enregistré avec succès !');
        setUserProfile(cleanedProfile);
        fetchInvoices();
      } else {
        setProfileMessage('❌ Une erreur est survenue lors de l\'enregistrement.');
      }
    } catch (err) {
      setProfileMessage('❌ Erreur de connexion avec le serveur.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleAddInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', amount: '' }]);
  };

  const handleRemoveInvoiceItem = (index: number) => {
    if (invoiceItems.length === 1) return;
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleInvoiceItemChange = (index: number, field: 'description' | 'amount', value: string) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index][field] = value;
    setInvoiceItems(updatedItems);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientMessage(''); setClientError(''); setLoadingClient(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, companyName: companyNameField, neq, address, email, phone }),
      });
      if (!response.ok) throw new Error('Erreur lors de la création du client.');
      setClientMessage('✅ Client ajouté avec succès !');
      setName(''); setCompanyNameField(''); setNeq(''); setAddress(''); setEmail(''); setPhone('');
      fetchClients();
    } catch (err: any) {
      setClientError('❌ Impossible d\'ajouter le client.');
    } finally {
      setLoadingClient(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce client ?')) return;
    const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (response.ok) { fetchClients(); fetchInvoices(); }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette facture définitivement ?')) return;
    try {
      const response = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (response.ok) fetchInvoices();
      else alert('Une erreur est survenue lors de la suppression.');
    } catch (err) {
      alert('Erreur de connexion avec le serveur.');
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceMessage(''); setInvoiceError(''); setLoadingInvoice(true);
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, items: invoiceItems }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur facture');
      setInvoiceMessage(`✅ Facture ${data.invoiceNumber} générée avec succès !`);
      setSelectedClientId('');
      setInvoiceItems([{ description: '', amount: '' }]);
      fetchInvoices();
    } catch (err: any) {
      setInvoiceError(err.message || '❌ Une erreur est survenue.');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PENDING' ? 'PAID' : 'PENDING';
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (response.ok) fetchInvoices();
    } catch (err) {
      console.error("Erreur changement statut:", err);
    }
  };

  const handlePrintInvoice = (invoice: any) => {
    const subtotal = Number(invoice.amountSubtotal);
    const tps = Number(invoice.tpsAmount);
    const tvq = Number(invoice.tvqAmount);
    const total = Number(invoice.amountTotal);

    let parsedItems = [];
    try {
      if (invoice.items) {
        parsedItems = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
      }
    } catch (e) {
      console.error("Erreur lors du décodage des items :", e);
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      parsedItems = [{ description: 'Services professionnels informatiques', amount: invoice.amountSubtotal }];
    }

    const logoHtml = invoice.userCompanyLogo || userProfile.companyLogo
      ? `<img src="${invoice.userCompanyLogo || userProfile.companyLogo}" style="max-height: 70px; max-width: 200px; margin-bottom: 10px; object-fit: contain; display: block;" />`
      : '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Facture ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f7fafc; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; background-color: #ebf8ff; color: #2b6cb0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              ${logoHtml}
              <h2>FACTURE</h2>
              <p><strong>Numéro :</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Date :</strong> ${new Date(invoice.createdAt || Date.now()).toLocaleDateString('fr-CA')}</p>
            </div>
            <div style="text-align: right;">
              <h3>Émetteur</h3>
              <p>${invoice.userCompanyName || userProfile.companyName || 'Votre Entreprise'}</p>
              <p>${invoice.userCompanyAddress || userProfile.companyAddress || 'Québec, Canada'}</p>
              ${(invoice.userTpsNumber || userProfile.tpsNumber) ? `<p><strong>TPS :</strong> ${invoice.userTpsNumber || userProfile.tpsNumber}</p>` : ''}
              ${(invoice.userTvqNumber || userProfile.tvqNumber) ? `<p><strong>TVQ :</strong> ${invoice.userTvqNumber || userProfile.tvqNumber}</p>` : ''}
            </div>
          </div>
          
          <div style="margin-top: 30px;">
            <h3>Facturé à :</h3>
            <p><strong>${invoice.clientName}</strong></p>
            <p>Entreprise : ${invoice.clientCompany || '—'}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${parsedItems.map((item: any) => `
                <tr>
                  <td>${item.description || 'Service général'}</td>
                  <td class="text-right">${(Number(item.amount) || 0).toFixed(2)} $</td>
                </tr>
              `).join('')}
              <tr>
                <td style="border-top: 2px solid #ddd; padding-top: 20px;"><strong>Sous-total</strong></td>
                <td class="text-right" style="border-top: 2px solid #ddd; padding-top: 20px;">${subtotal.toFixed(2)} $</td>
              </tr>
              <tr>
                <td>TPS (5%)</td>
                <td class="text-right">${tps.toFixed(2)} $</td>
              </tr>
              <tr>
                <td>TVQ (9.975%)</td>
                <td class="text-right">${tvq.toFixed(2)} $</td>
              </tr>
              <tr class="total-row">
                <td>TOTAL TOUT INCLUS DUE</td>
                <td class="text-right">${total.toFixed(2)} $</td>
              </tr>
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const liveSubtotalNum = invoiceItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const liveTPS = Math.round((liveSubtotalNum * 0.05) * 100) / 100;
  const liveTVQ = Math.round((liveSubtotalNum * 0.09975) * 100) / 100;
  const liveTotal = liveSubtotalNum + liveTPS + liveTVQ;

  const statsPaid = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (Number(i.amountTotal) || 0), 0);
  const statsPending = invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + (Number(i.amountTotal) || 0), 0);
  const statsTotalRevenue = invoices.reduce((sum, i) => sum + (Number(i.amountTotal) || 0), 0);
  const statsTotalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const statsNetRevenue = statsPaid - statsTotalExpenses;

  if (checkingAuth) return <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>Vérification de la session...</div>;
  if (!authorized) return <div style={{ padding: '40px' }}>🔒 Accès Refusé</div>;

    return (
  <div
    style={{
      padding: '10px 20px',
      fontFamily: 'sans-serif',
      maxWidth: '1400px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      color: 'var(--foreground)',
      transition: 'background-color 0.25s ease, color 0.25s ease',
    }}
  >
      
      {/* NOURRICE DE L'EN-TÊTE ÉPURÉ (DashboardHeader) */}
      <DashboardHeader userName={userProfile.companyName || "Entrepreneur"} />

      {/* RENDER DES CARTES DE STATISTIQUES FINANCIÈRES (VISIBLES EN FACTURATION) */}
     {activeTab === 'billing' && (
  <div
    style={{
      display: 'flex',
      gap: '20px',
      width: '100%',
      marginBottom: '30px',
      flexWrap: 'wrap',
    }}
  >
    {/* Volume global */}
    <div
      style={{
        flex: '1 1 220px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      }}
    >
      <span
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: 'var(--primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        📈 Volume global
      </span>

      <h3
        style={{
          margin: '10px 0 0 0',
          fontSize: '24px',
          color: 'var(--foreground)',
          fontWeight: 'bold',
        }}
      >
        {statsTotalRevenue.toFixed(2)} $
      </h3>

      <p
        style={{
          margin: '4px 0 0 0',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        Total de toutes les factures émises
      </p>
    </div>

    {/* Revenus encaissés */}
    <div
      style={{
        flex: '1 1 220px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      }}
    >
      <span
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: 'var(--success)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        💰 Revenus encaissés
      </span>

      <h3
        style={{
          margin: '10px 0 0 0',
          fontSize: '24px',
          color: 'var(--foreground)',
          fontWeight: 'bold',
        }}
      >
        {statsPaid.toFixed(2)} $
      </h3>

      <p
        style={{
          margin: '4px 0 0 0',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        Argent reçu en banque
      </p>
    </div>

    {/* Comptes à recevoir */}
    <div
      style={{
        flex: '1 1 220px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      }}
    >
      <span
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: 'var(--warning)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        ⏳ Comptes à recevoir
      </span>

      <h3
        style={{
          margin: '10px 0 0 0',
          fontSize: '24px',
          color: 'var(--foreground)',
          fontWeight: 'bold',
        }}
      >
        {statsPending.toFixed(2)} $
      </h3>

      <p
        style={{
          margin: '4px 0 0 0',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        Factures en attente de paiement
      </p>
    </div>

    {/* Revenu net */}
    <div
      style={{
        flex: '1 1 220px',
        backgroundColor: 'var(--surface)',
        border: `1px solid ${
          statsNetRevenue >= 0
            ? 'var(--success)'
            : 'var(--danger)'
        }`,
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      }}
    >
      <span
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color:
            statsNetRevenue >= 0
              ? 'var(--success)'
              : 'var(--danger)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        📊 Revenu net réel
      </span>

      <h3
        style={{
          margin: '10px 0 0 0',
          fontSize: '24px',
          color: 'var(--foreground)',
          fontWeight: 'bold',
        }}
      >
        {statsNetRevenue.toFixed(2)} $
      </h3>

      <p
        style={{
          margin: '4px 0 0 0',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        Encaissé moins les dépenses
      </p>
    </div>
  </div>
)}

      {/* AFFICHAGE EN FONCTION DE L'ONGLET SÉLECTIONNÉ */}
      {activeTab === 'quotes' ? (
  <QuotesSection />
) : activeTab === 'profile' ? (
  /* ONGLET PROFIL COMPAGNIE */
  <div
    style={{
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto',
    }}
  >
    <section
      style={{
        border: '1px solid var(--border)',
        padding: '25px',
        borderRadius: '8px',
        backgroundColor: 'var(--surface)',
        color: 'var(--foreground)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.12)',
      }}
    >
      <h2
        style={{
          marginTop: 0,
          fontSize: '18px',
          color: 'var(--foreground)',
          marginBottom: '20px',
        }}
      >
        🏢 Configurer l'émetteur des factures
      </h2>

      {profileMessage && (
        <div
          style={{
            backgroundColor: profileMessage.includes('⚠️')
              ? 'rgba(245, 158, 11, 0.12)'
              : 'rgba(34, 197, 94, 0.12)',
            color: profileMessage.includes('⚠️')
              ? 'var(--warning)'
              : 'var(--success)',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '13px',
            fontWeight: 'bold',
            border: `1px solid ${
              profileMessage.includes('⚠️')
                ? 'var(--warning)'
                : 'var(--success)'
            }`,
          }}
        >
          {profileMessage}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} noValidate>
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 'bold',
              color: 'var(--foreground)',
              marginBottom: '8px',
            }}
          >
            Logo de l'entreprise (PNG, JPG ou WebP, max 1 Mo)
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <label
              htmlFor="logo-upload"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                backgroundColor: 'var(--surface-soft)',
                color: 'var(--foreground)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                border: '1px solid var(--border)',
              }}
            >
              📁 Choisir une image...
            </label>

            <input
              id="logo-upload"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleLogoChange}
              style={{ display: 'none' }}
            />

            {!userProfile.companyLogo && (
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                }}
              >
                Aucun logo sélectionné
              </span>
            )}
          </div>

          {userProfile.companyLogo && (
            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                backgroundColor: 'var(--surface-soft)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
              }}
            >
              <img
                src={userProfile.companyLogo}
                alt="Aperçu du logo"
                style={{
                  maxHeight: '55px',
                  maxWidth: '180px',
                  objectFit: 'contain',
                  border: '1px solid var(--border)',
                  padding: '4px',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setUserProfile({
                    ...userProfile,
                    companyLogo: '',
                  })
                }
                style={{
                  padding: '5px 10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                🗑️ Retirer le logo
              </button>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 'bold',
              color: 'var(--text-muted)',
              marginBottom: '4px',
            }}
          >
            Nom de l'entreprise *
          </label>

          <input
            type="text"
            placeholder="Ex: Informatique Matane inc."
            value={userProfile.companyName || ''}
            onChange={(e) =>
              setUserProfile({
                ...userProfile,
                companyName: e.target.value,
              })
            }
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-soft)',
              color: 'var(--foreground)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 'bold',
              color: 'var(--text-muted)',
              marginBottom: '4px',
            }}
          >
            Adresse complète d'affaires *
          </label>

          <input
            type="text"
            placeholder="Ex: 280 Rue Jacques-Cartier, Matane, QC"
            value={userProfile.companyAddress || ''}
            onChange={(e) =>
              setUserProfile({
                ...userProfile,
                companyAddress: e.target.value,
              })
            }
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-soft)',
              color: 'var(--foreground)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ width: '50%' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 'bold',
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}
            >
              Numéro de TPS *
            </label>

            <input
              type="text"
              placeholder="123456789RT0001"
              value={userProfile.tpsNumber || ''}
              onChange={(e) =>
                setUserProfile({
                  ...userProfile,
                  tpsNumber: e.target.value,
                })
              }
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-soft)',
                color: 'var(--foreground)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ width: '50%' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 'bold',
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}
            >
              Numéro de TVQ *
            </label>

            <input
              type="text"
              placeholder="1234567890TQ0001"
              value={userProfile.tvqNumber || ''}
              onChange={(e) =>
                setUserProfile({
                  ...userProfile,
                  tvqNumber: e.target.value,
                })
              }
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-soft)',
                color: 'var(--foreground)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          {loadingProfile
            ? 'Enregistrement...'
            : '💾 Enregistrer le profil'}
        </button>
      </form>
    </section>
  </div>
) : activeTab === 'privacy' ? (
     /* 📄 ONGLET CONFIDENTIALITÉ & LOI 25 EXHAUSTIF */
    <div
      style={{
        width: '100%',
        maxWidth: '900px',
        margin: '0 auto',
        lineHeight: '1.6',
      }}
    >
      <section
        style={{
          border: '1px solid var(--border)',
          padding: '35px',
          borderRadius: '12px',
          backgroundColor: 'var(--surface)',
          color: 'var(--foreground)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.12)',
        }}
      >
        {/* En-tête du document */}
        <div
          style={{
            borderBottom: '2px solid var(--border)',
            paddingBottom: '15px',
            marginBottom: '25px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
          }}
        >
          <div>
            <h2
              style={{
                marginTop: 0,
                fontSize: '22px',
                color: 'var(--primary)',
                marginBottom: '6px',
              }}
            >
              🛡️ Politique de Confidentialité & Conformité Loi 25
            </h2>

            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                margin: 0,
              }}
            >
              Politique relative à la protection des renseignements personnels
              applicables au Québec.
            </p>
          </div>

          <span
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              color: 'var(--success)',
              border: '1px solid var(--success)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            ✅ Conforme Loi 25
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            color: 'var(--foreground)',
            fontSize: '14px',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '16px',
                color: 'var(--primary)',
                marginTop: 0,
                marginBottom: '8px',
              }}
            >
              1. Engagement et Champ d'Application
            </h3>

            <p style={{ margin: 0 }}>
              <strong>Québec Facture</strong> s'engage à protéger la vie privée
              et les renseignements personnels de ses utilisateurs et des clients
              de ces derniers. La présente politique décrit nos pratiques en
              matière de collecte, d'utilisation, de conservation et de
              destruction des données conformément à la{' '}
              <em>
                Loi sur la protection des renseignements personnels dans le
                secteur privé (Loi 25)
              </em>{' '}
              du Québec.
            </p>
          </div>

          <div>
            <h3
              style={{
                fontSize: '16px',
                color: 'var(--primary)',
                marginTop: 0,
                marginBottom: '8px',
              }}
            >
              2. Renseignements Personnels Collectés
            </h3>

            <p style={{ marginBottom: '8px', marginTop: 0 }}>
              Dans le cadre de l'utilisation de nos services de facturation et
              de comptabilité, nous traitons les données suivantes :
            </p>

            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li style={{ marginBottom: '6px' }}>
                <strong>Données de l'utilisateur (Émetteur) :</strong> Raison
                sociale ou nom d'entreprise, adresse professionnelle, adresse
                courriel d'authentification, numéros d'inscription aux fichiers
                de taxes (TPS/TVQ) et identifiants de session.
              </li>

              <li style={{ marginBottom: '6px' }}>
                <strong>Données des clients finaux :</strong> Nom complet, nom
                d'entreprise affiliée, Numéro d'Entreprise du Québec (NEQ),
                adresse de facturation, courriel et numéro de téléphone.
              </li>

              <li>
                <strong>Données financières et dépenses :</strong> Montants des
                factures, lignes de services, historique des dépenses et reçus
                d'entreprise.
              </li>
            </ul>
          </div>

          <div>
            <h3
              style={{
                fontSize: '16px',
                color: 'var(--primary)',
                marginTop: 0,
                marginBottom: '8px',
              }}
            >
              3. Finalités du Traitement des Données
            </h3>

            <p style={{ margin: 0 }}>
              Les données sont traitées exclusivement pour :
            </p>

            <ul
              style={{
                paddingLeft: '20px',
                marginTop: '6px',
                marginBottom: 0,
              }}
            >
              <li>
                La génération et l'impression de factures conformes aux règles
                fiscales québécoises (calcul TPS/TVQ).
              </li>
              <li>
                La tenue de registres de dépenses d'affaires et le calcul du
                Revenu Net Réel.
              </li>
              <li>
                La gestion de votre abonnement et le traitement des paiements
                sécurisés via Stripe.
              </li>
              <li>
                La prévention des fraudes et l'assurance de la sécurité des
                sessions.
              </li>
            </ul>
          </div>

          <div>
            <h3
              style={{
                fontSize: '16px',
                color: 'var(--primary)',
                marginTop: 0,
                marginBottom: '8px',
              }}
            >
              4. Hébergement et Mesures de Sécurité
            </h3>

            <p style={{ margin: 0 }}>
              Vos données sont hébergées sur une infrastructure de base de
              données PostgreSQL isolée (Neon Serverless) utilisant un
              chiffrement fort au repos et en transit (TLS/SSL). Les données
              bancaires ne sont jamais stockées sur nos serveurs : toutes les
              transactions sont déléguées à l'infrastructure certifiée PCI-DSS
              de <strong>Stripe</strong>.
            </p>
          </div>

          <div>
            <h3
              style={{
                fontSize: '16px',
                color: 'var(--primary)',
                marginTop: 0,
                marginBottom: '8px',
              }}
            >
              5. Droits des Personnes Concernées (Accès, Rectification, Suppression)
            </h3>

            <p style={{ margin: 0 }}>
              Conformément à la Loi 25, vous disposez d'un droit d'accès, de
              rectification et de suppression (droit à l'oubli) concernant vos
              renseignements personnels :
            </p>

            <ul
              style={{
                paddingLeft: '20px',
                marginTop: '6px',
                marginBottom: 0,
              }}
            >
              <li>
                Vous pouvez rectifier vos données d'entreprise dans l'onglet{' '}
                <strong>Données de l'entreprise</strong>.
              </li>
              <li>
                Vous pouvez supprimer définitivement un client, une dépense ou
                une facture via le bouton <strong>Supprimer</strong>. Cette
                opération efface définitivement l'enregistrement de la base de
                données.
              </li>
            </ul>
          </div>

          <div>
            <h3
              style={{
                fontSize: '16px',
                color: 'var(--primary)',
                marginTop: 0,
                marginBottom: '8px',
              }}
            >
              6. Incident de Confidentialité
            </h3>

            <p style={{ margin: 0 }}>
              En cas d'incident de sécurité ou de fuite de données présentant un
              risque de préjudice sérieux, Québec Facture avisera promptement la{' '}
              <em>Commission d'accès à l'information du Québec (CAI)</em> ainsi
              que les utilisateurs touchés, conformément aux exigences légales.
            </p>
          </div>

          {/* Bloc Responsable de la protection des données */}
          <div
            style={{
              backgroundColor: 'var(--surface-soft)',
              padding: '18px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              marginTop: '10px',
            }}
          >
            <h4
              style={{
                margin: '0 0 6px 0',
                color: 'var(--primary)',
                fontSize: '15px',
              }}
            >
              👤 Responsable de la protection des renseignements personnels (RPRP)
            </h4>

            <p
              style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: '1.5',
                color: 'var(--foreground)',
              }}
            >
              Pour toute question, demande d'accès ou plainte relative à vos
              renseignements personnels :
              <br />

              <strong>Responsable :</strong> Direction de la conformité — Québec Facture
              <br />

              <strong>Courriel :</strong>{' '}
              <a
                href="mailto:support@quebecfacture.com"
                style={{
                  color: 'var(--primary)',
                  fontWeight: 'bold',
                }}
              >
                support@quebecfacture.com
              </a>
              <br />

              <strong>Emplacement :</strong> Matane, Québec, Canada
            </p>
          </div>
        </div>
      </section>
    </div>
              
      
      ) : activeTab === 'expenses' ? (
        /* ONGLET GESTION DES DÉPENSES */
        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', width: '100%' }}>
          <div style={{ width: '380px', flexShrink: 0 }}>
          <section
            style={{
              border: '1px solid var(--border)',
              padding: '25px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.12)',
            }}
          >
            <h2
              style={{
                marginTop: 0,
                fontSize: '18px',
                color: 'var(--danger)',
                marginBottom: '20px',
              }}
            >
              📉 Saisir une dépense d'affaires
            </h2>

            {expenseMessage && (
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  color: 'var(--success)',
                  border: '1px solid var(--success)',
                  padding: '8px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  fontSize: '12px',
                }}
              >
                {expenseMessage}
              </div>
            )}

            {expenseError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)',
                  padding: '8px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  fontSize: '12px',
                }}
              >
                {expenseError}
              </div>
            )}

            <form onSubmit={handleAddExpense}>
              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  Description *
                </label>

                <input
                  type="text"
                  placeholder="Ex: Licence Adobe, Hébergement Cloud..."
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-soft)',
                    color: 'var(--foreground)',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  Montant ($ CAD) *
                </label>

                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-soft)',
                    color: 'var(--foreground)',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  Catégorie
                </label>

                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-soft)',
                    color: 'var(--foreground)',
                  }}
                >
                  <option value="Équipement">
                    💻 Équipement / Matériel
                  </option>
                  <option value="Logiciels">
                    ☁️ Logiciels & Abonnements
                  </option>
                  <option value="Transport">
                    🚗 Déplacements & Transport
                  </option>
                  <option value="Bureau">
                    📦 Fournitures de bureau
                  </option>
                  <option value="Autre">
                    🏷️ Autre dépense
                  </option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Enregistrer la dépense
              </button>
            </form>
          </section>
        </div>

         <div style={{ flexGrow: 1 }}>
  <section
    style={{
      border: '1px solid var(--border)',
      padding: '25px',
      borderRadius: '8px',
      backgroundColor: 'var(--surface)',
      color: 'var(--foreground)',
    }}
  >
    <h2
      style={{
        marginTop: 0,
        fontSize: '18px',
        color: 'var(--foreground)',
        marginBottom: '20px',
      }}
    >
      📜 Historique des charges ({expenses.length})
    </h2>

    {expenses.length === 0 ? (
      <p
        style={{
          color: 'var(--text-muted)',
          fontStyle: 'italic',
          fontSize: '13px',
        }}
      >
        Aucune dépense enregistrée.
      </p>
    ) : (
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
          color: 'var(--foreground)',
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: 'var(--surface-soft)',
              borderBottom: '2px solid var(--border)',
              textAlign: 'left',
              color: 'var(--foreground)',
            }}
          >
            <th style={{ padding: '10px' }}>Description</th>
            <th style={{ padding: '10px' }}>Catégorie</th>
            <th style={{ padding: '10px' }}>Montant</th>
            <th style={{ padding: '10px' }}>Date</th>
            <th style={{ padding: '10px' }}>Action</th>
          </tr>
        </thead>

        <tbody>
          {expenses.map(exp => (
            <tr
              key={exp.id}
              style={{
                borderBottom: '1px solid var(--border)',
              }}
            >
              <td style={{ padding: '10px' }}>
                <strong>{exp.description}</strong>
              </td>

              <td style={{ padding: '10px' }}>
                <span
                  style={{
                    backgroundColor: 'var(--surface-soft)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                >
                  {exp.category}
                </span>
              </td>

              <td
                style={{
                  padding: '10px',
                  fontWeight: 'bold',
                  color: 'var(--danger)',
                }}
              >
                {Math.abs(Number(exp.amount) || 0).toFixed(2)} $
              </td>

              <td
                style={{
                  padding: '10px',
                  color: 'var(--text-muted)',
                }}
              >
                {exp.createdAt
                  ? new Date(exp.createdAt).toLocaleDateString('fr-CA')
                  : new Date().toLocaleDateString('fr-CA')}
              </td>

              <td style={{ padding: '10px' }}>
                <button
                  onClick={() => handleDeleteExpense(exp.id)}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: 'var(--danger)',
                    border: '1px solid var(--danger)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </section>
</div>
</div>
     ) : activeTab === 'settings' ? (
  <div
    style={{
      width: '100%',
      maxWidth: '760px',
      margin: '0 auto',
      padding: '10px 0'
    }}
  >
    <div style={{ marginBottom: '30px' }}>
      <h2 style={{ fontSize: '26px', color: '#2d3748', marginBottom: '8px' }}>
        ⚙️ Paramètres
      </h2>
      <p style={{ color: '#718096', fontSize: '14px' }}>
        Gérez votre compte, votre forfait et vos informations de facturation.
      </p>
    </div>

    <section
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '28px',
        marginBottom: '20px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.04)'
      }}
    >
      <h3 style={{ marginTop: 0, fontSize: '18px', color: '#2d3748' }}>
        💳 Abonnement & facturation
      </h3>

      <p style={{ color: '#718096', fontSize: '14px', marginBottom: '20px' }}>
        Gérez votre abonnement, votre mode de paiement et l'annulation depuis Stripe.
      </p>

      <div
        style={{
          padding: '15px',
          backgroundColor: '#f7fafc',
          borderRadius: '8px',
          marginBottom: '20px'
        }}
      >
        <strong>Forfait actuel :</strong>{' '}
        {userPlan === 'FREE'
          ? 'Plan Free'
          : subscriptionStatus === 'TRIALING'
          ? 'Essai Pro'
          : 'Plan Professionnel'}
        <br />
        <span style={{ fontSize: '13px', color: '#718096' }}>
          Statut :{' '}
          {subscriptionStatus === 'TRIALING'
            ? cancelAtPeriodEnd
              ? 'Essai actif — annulation programmée'
              : 'Essai en cours'
            : subscriptionStatus === 'ACTIVE'
            ? cancelAtPeriodEnd
              ? 'Actif — annulation programmée'
              : 'Actif'
            : subscriptionStatus === 'PAST_DUE'
            ? 'Paiement à régulariser'
            : subscriptionStatus === 'CANCELED'
            ? 'Annulé'
            : 'En attente'}
        </span>
      </div>

      {userPlan === 'PRO' && stripeCustomerId ? (
        <button
          type="button"
          onClick={handleOpenStripePortal}
          style={{
            width: '100%',
            padding: '13px',
            backgroundColor: cancelAtPeriodEnd ? '#d69e2e' : '#3182ce',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          {cancelAtPeriodEnd
            ? 'Gérer ou réactiver mon abonnement'
            : subscriptionStatus === 'TRIALING'
            ? 'Gérer ou annuler mon essai'
            : 'Gérer mon abonnement'}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleChoosePlan}
          style={{
            width: '100%',
            padding: '13px',
            backgroundColor: '#3182ce',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Voir les options de forfait
        </button>
      )}
    </section>
  </div>
) : activeTab === 'subscription' ? (
  <div
    style={{
      width: '100%',
      maxWidth: '760px',
      margin: '0 auto',
      padding: '10px 0',
      color: 'var(--foreground)',
    }}
  >
    <div
      style={{
        textAlign: 'center',
        marginBottom: '35px',
      }}
    >
      <h2
        style={{
          fontSize: '26px',
          color: 'var(--foreground)',
          marginBottom: '8px',
        }}
      >
        Mon abonnement
      </h2>

      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: '14px',
        }}
      >
        Consultez votre forfait actuel et gérez votre abonnement.
      </p>
    </div>

    <div
      style={{
        backgroundColor: 'var(--surface)',
        color: 'var(--foreground)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '32px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      }}
    >
      {loadingSubscription ? (
        <p
          style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          Chargement de votre abonnement...
        </p>

      ) : userPlan === 'FREE' ? (
        <>
          <span
            style={{
              backgroundColor: 'var(--surface-soft)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
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
              color: 'var(--foreground)',
            }}
          >
            Plan Free
          </h3>

          <div
            style={{
              fontSize: '34px',
              fontWeight: 'bold',
              margin: '15px 0',
              color: 'var(--foreground)',
            }}
          >
            0,00 $
            <span
              style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                fontWeight: 'normal',
              }}
            >
              {' '}
              / mois
            </span>
          </div>

          <p style={{ color: 'var(--text-muted)' }}>
            Votre forfait gratuit est actif.
          </p>

          <ul
            style={{
              lineHeight: '2',
              marginTop: '25px',
              color: 'var(--foreground)',
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
              backgroundColor: 'var(--primary)',
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

      ) : subscriptionStatus === 'TRIALING' ? (
        <>
          <span
            style={{
              backgroundColor: cancelAtPeriodEnd
                ? 'rgba(245, 158, 11, 0.12)'
                : 'rgba(139, 92, 246, 0.12)',
              color: cancelAtPeriodEnd
                ? 'var(--warning)'
                : '#a78bfa',
              border: `1px solid ${
                cancelAtPeriodEnd
                  ? 'var(--warning)'
                  : '#8b5cf6'
              }`,
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {cancelAtPeriodEnd
              ? '⚠️ ANNULATION PROGRAMMÉE'
              : '🎁 ESSAI EN COURS'}
          </span>

          <h3
            style={{
              fontSize: '25px',
              marginTop: '18px',
              color: 'var(--foreground)',
            }}
          >
            ⚡ Essai du Plan Professionnel
          </h3>

          <div
            style={{
              fontSize: '34px',
              fontWeight: 'bold',
              color: '#a78bfa',
              margin: '15px 0',
            }}
          >
            0,00 $
            <span
              style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                fontWeight: 'normal',
              }}
            >
              {' '}
              pendant l'essai
            </span>
          </div>

          <p style={{ color: 'var(--foreground)' }}>
            Vous profitez actuellement de toutes les fonctionnalités
            du Plan Professionnel.
          </p>

          {cancelAtPeriodEnd ? (
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid var(--warning)',
                borderRadius: '8px',
                color: 'var(--warning)',
              }}
            >
              <strong>⚠️ Annulation programmée</strong>

              <div style={{ marginTop: '10px' }}>
                Votre essai reste actif jusqu'au{' '}
                <strong>
                  {cancelAt || trialEnd
                    ? new Date(
                        cancelAt || trialEnd || ''
                      ).toLocaleDateString('fr-CA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })
                    : 'terme de la période'}
                </strong>.
              </div>

              <div style={{ marginTop: '8px' }}>
                Vous ne serez pas facturé{' '}
                <strong>15,00 $ CA</strong> après cette date.
              </div>
            </div>

          ) : trialEnd ? (
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid #8b5cf6',
                borderRadius: '8px',
                color: '#c4b5fd',
              }}
            >
              <strong>Fin de l'essai :</strong>{' '}
              {new Date(trialEnd).toLocaleDateString('fr-CA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC',
              })}

              <div style={{ marginTop: '8px' }}>
                Puis <strong>15,00 $ CA / mois</strong> si vous
                n'annulez pas avant cette date.
              </div>
            </div>
          ) : null}

          <button
            onClick={handleOpenStripePortal}
            style={{
              width: '100%',
              marginTop: '25px',
              padding: '13px',
              backgroundColor: cancelAtPeriodEnd
                ? 'var(--warning)'
                : '#8b5cf6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {cancelAtPeriodEnd
              ? 'Gérer ou réactiver mon abonnement'
              : 'Gérer ou annuler mon essai'}
          </button>
        </>

      ) : subscriptionStatus === 'ACTIVE' ? (
        <>
          <span
            style={{
              backgroundColor: cancelAtPeriodEnd
                ? 'rgba(245, 158, 11, 0.12)'
                : 'rgba(34, 197, 94, 0.12)',
              color: cancelAtPeriodEnd
                ? 'var(--warning)'
                : 'var(--success)',
              border: `1px solid ${
                cancelAtPeriodEnd
                  ? 'var(--warning)'
                  : 'var(--success)'
              }`,
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {cancelAtPeriodEnd
              ? '⚠️ ANNULATION PROGRAMMÉE'
              : 'ABONNEMENT ACTIF'}
          </span>

          <h3
            style={{
              fontSize: '25px',
              marginTop: '18px',
              color: 'var(--foreground)',
            }}
          >
            ⚡ Plan Professionnel
          </h3>

          <div
            style={{
              fontSize: '34px',
              fontWeight: 'bold',
              color: 'var(--primary)',
              margin: '15px 0',
            }}
          >
            15,00 $
            <span
              style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                fontWeight: 'normal',
              }}
            >
              {' '}
              CA / mois
            </span>
          </div>

          {cancelAtPeriodEnd ? (
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid var(--warning)',
                borderRadius: '8px',
                color: 'var(--warning)',
              }}
            >
              <strong>⚠️ Annulation programmée</strong>

              <div style={{ marginTop: '10px' }}>
                Votre abonnement reste actif jusqu'au{' '}
                <strong>
                  {cancelAt || currentPeriodEnd
                    ? new Date(
                        cancelAt || currentPeriodEnd || ''
                      ).toLocaleDateString('fr-CA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })
                    : 'terme de la période'}
                </strong>.
              </div>

              <div style={{ marginTop: '8px' }}>
                Aucun nouveau prélèvement ne sera effectué
                après cette date.
              </div>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--foreground)' }}>
                Votre abonnement Professionnel est actif.
              </p>

              {currentPeriodEnd && (
                <p
                  style={{
                    marginTop: '15px',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                  }}
                >
                  Prochaine échéance :{' '}
                  <strong>
                    {new Date(currentPeriodEnd).toLocaleDateString(
                      'fr-CA',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'UTC',
                      }
                    )}
                  </strong>
                </p>
              )}
            </>
          )}

          <button
            onClick={handleOpenStripePortal}
            style={{
              width: '100%',
              marginTop: '25px',
              padding: '13px',
              backgroundColor: cancelAtPeriodEnd
                ? 'var(--warning)'
                : 'var(--success)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {cancelAtPeriodEnd
              ? 'Gérer ou réactiver mon abonnement'
              : 'Gérer mon abonnement'}
          </button>
        </>

      ) : subscriptionStatus === 'PAST_DUE' ? (
        <>
          <span
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--danger)',
              border: '1px solid var(--danger)',
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
              fontSize: '25px',
              marginTop: '18px',
              color: 'var(--foreground)',
            }}
          >
            ⚠️ Plan Professionnel
          </h3>

          <p
            style={{
              marginTop: '20px',
              color: 'var(--danger)',
            }}
          >
            Votre dernier paiement n'a pas pu être traité.
          </p>

          <button
            onClick={handleOpenStripePortal}
            style={{
              width: '100%',
              marginTop: '25px',
              padding: '13px',
              backgroundColor: 'var(--danger)',
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

      ) : (
        <>
          <span
            style={{
              backgroundColor: 'var(--surface-soft)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            ABONNEMENT INACTIF
          </span>

          <h3
            style={{
              fontSize: '25px',
              marginTop: '18px',
              color: 'var(--foreground)',
            }}
          >
            Plan Free
          </h3>

          <p
            style={{
              marginTop: '15px',
              color: 'var(--text-muted)',
            }}
          >
            Aucun abonnement Professionnel actif.
          </p>

          <button
            onClick={handleChoosePlan}
            style={{
              width: '100%',
              marginTop: '25px',
              padding: '13px',
              backgroundColor: 'var(--primary)',
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

      {subscriptionError && (
        <div
          style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            borderRadius: '8px',
          }}
        >
          {subscriptionError}
        </div>
      )}
    </div>
  </div>
) : (  /* ONGLET FACTURATION STANDARD ('billing') */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
          <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '380px', flexShrink: 0 }}>
              <section
                style={{
                  border: '1px solid var(--border)',
                  padding: '20px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--foreground)',
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    fontSize: '16px',
                    color: 'var(--foreground)',
                  }}
                >
                  ➕ Ajouter un client
                </h2>

                {clientMessage && (
                  <div
                    style={{
                      backgroundColor: 'rgba(34, 197, 94, 0.12)',
                      color: 'var(--success)',
                      border: '1px solid var(--success)',
                      padding: '6px',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      fontSize: '12px',
                    }}
                  >
                    {clientMessage}
                  </div>
                )}

                {clientError && (
                  <div
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      color: 'var(--danger)',
                      border: '1px solid var(--danger)',
                      padding: '6px',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      fontSize: '12px',
                    }}
                  >
                    {clientError}
                  </div>
                )}

                <form onSubmit={handleAddClient}>
                  <input
                    type="text"
                    placeholder="Nom du client *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      marginBottom: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-soft)',
                      color: 'var(--foreground)',
                      boxSizing: 'border-box',
                    }}
                    required
                  />

                  <input
                    type="text"
                    placeholder="Entreprise affiliée"
                    value={companyNameField}
                    onChange={(e) => setCompanyNameField(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      marginBottom: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-soft)',
                      color: 'var(--foreground)',
                      boxSizing: 'border-box',
                    }}
                  />

                  <input
                    type="text"
                    placeholder="NEQ"
                    value={neq}
                    onChange={(e) => setNeq(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      marginBottom: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-soft)',
                      color: 'var(--foreground)',
                      boxSizing: 'border-box',
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Adresse"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      marginBottom: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-soft)',
                      color: 'var(--foreground)',
                      boxSizing: 'border-box',
                    }}
                  />

                  <input
                    type="email"
                    placeholder="Courriel"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      marginBottom: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-soft)',
                      color: 'var(--foreground)',
                      boxSizing: 'border-box',
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Téléphone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      marginBottom: '12px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-soft)',
                      color: 'var(--foreground)',
                      boxSizing: 'border-box',
                    }}
                  />

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: 'var(--success)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Ajouter
                  </button>
                </form>
              </section>
              <section
              id="create-invoice"
              style={{
                border: '1px solid var(--border)',
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: 'var(--surface)',
                color: 'var(--foreground)',
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  fontSize: '16px',
                  color: 'var(--primary)',
                }}
              >
                🧾 Créer une facture
              </h2>

              {invoiceMessage && (
                <div
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    color: 'var(--success)',
                    padding: '6px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    fontSize: '12px',
                    border: '1px solid var(--success)',
                  }}
                >
                  {invoiceMessage}
                </div>
              )}

              {invoiceError && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: 'var(--danger)',
                    padding: '6px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    fontSize: '12px',
                    border: '1px solid var(--danger)',
                  }}
                >
                  {invoiceError}
                </div>
              )}

              <form onSubmit={handleCreateInvoice}>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    marginBottom: '15px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-soft)',
                    color: 'var(--foreground)',
                  }}
                  required
                >
                  <option value="">-- Sélectionner le client --</option>

                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'var(--primary)',
                    marginBottom: '6px',
                  }}
                >
                  Services et montants :
                </label>

                {invoiceItems.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '6px',
                      marginBottom: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Description du service"
                      value={item.description}
                      onChange={(e) =>
                        handleInvoiceItemChange(
                          index,
                          'description',
                          e.target.value
                        )
                      }
                      style={{
                        flexGrow: 1,
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface-soft)',
                        color: 'var(--foreground)',
                        fontSize: '13px',
                      }}
                      required
                    />

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Prix ($)"
                      value={item.amount}
                      onChange={(e) =>
                        handleInvoiceItemChange(
                          index,
                          'amount',
                          e.target.value
                        )
                      }
                      style={{
                        width: '85px',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface-soft)',
                        color: 'var(--foreground)',
                        fontSize: '13px',
                      }}
                      required
                    />

                    {invoiceItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveInvoiceItem(index)
                        }
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'var(--danger)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '12px',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddInvoiceItem}
                  style={{
                    width: '100%',
                    padding: '6px',
                    backgroundColor: 'var(--surface-soft)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '15px',
                    marginTop: '5px',
                  }}
                >
                  ➕ Ajouter une ligne de service
                </button>

                {liveSubtotalNum > 0 && (
                  <div
                    style={{
                      backgroundColor: 'var(--surface-soft)',
                      color: 'var(--foreground)',
                      padding: '10px',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      fontSize: '12px',
                      border: '1px dashed var(--border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Sous-total brut :</span>
                      <span>{liveSubtotalNum.toFixed(2)} $</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>TPS (5%) :</span>
                      <span>{liveTPS.toFixed(2)} $</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: '4px',
                      }}
                    >
                      <span>TVQ (9.975%) :</span>
                      <span>{liveTVQ.toFixed(2)} $</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 'bold',
                        color: 'var(--primary)',
                        paddingTop: '4px',
                      }}
                    >
                      <span>Total TTC :</span>
                      <span>{liveTotal.toFixed(2)} $</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedClientId || loadingInvoice}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor:
                      !selectedClientId || loadingInvoice
                        ? 'var(--surface-soft)'
                        : 'var(--primary)',
                    color:
                      !selectedClientId || loadingInvoice
                        ? 'var(--text-muted)'
                        : 'white',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    cursor:
                      !selectedClientId || loadingInvoice
                        ? 'not-allowed'
                        : 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {loadingInvoice
                    ? 'Génération...'
                    : 'Générer la facture'}
                </button>
              </form>
            </section>
            </div>

            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '40px' }}>
              <section
              style={{
                backgroundColor: 'var(--surface)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                transition: 'background-color 0.25s ease, color 0.25s ease',
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  fontSize: '18px',
                  color: 'var(--foreground)',
                }}
              >
                👥 Vos Clients ({clients.length})
              </h2>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                  color: 'var(--foreground)',
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--surface-soft)',
                      borderBottom: '2px solid var(--border)',
                      textAlign: 'left',
                      color: 'var(--foreground)',
                    }}
                  >
                    <th style={{ padding: '8px' }}>Nom</th>
                    <th style={{ padding: '8px' }}>NEQ</th>
                    <th style={{ padding: '8px' }}>Contact</th>
                    <th style={{ padding: '8px' }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {clients.map(c => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <td style={{ padding: '8px' }}>
                        <strong>{c.name}</strong>
                        {c.companyName && ` (${c.companyName})`}
                      </td>

                      <td style={{ padding: '8px' }}>
                        {c.neq || '—'}
                      </td>

                      <td style={{ padding: '8px' }}>
                        {c.email || c.phone || '—'}
                      </td>

                      <td style={{ padding: '8px' }}>
                        <button
                          onClick={() => handleDeleteClient(c.id)}
                          style={{
                            padding: '3px 8px',
                            backgroundColor: 'var(--danger)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

             <section
              style={{
                backgroundColor: 'var(--surface)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                transition: 'background-color 0.25s ease, color 0.25s ease',
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  fontSize: '18px',
                  color: 'var(--primary)',
                }}
              >
                🧾 Factures Émises ({invoices.length})
              </h2>

              {invoices.length === 0 ? (
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                    fontSize: '13px',
                  }}
                >
                  Aucune facture générée pour l'instant.
                </p>
              ) : (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                    color: 'var(--foreground)',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--surface-soft)',
                        borderBottom: '2px solid var(--border)',
                        textAlign: 'left',
                        color: 'var(--foreground)',
                      }}
                    >
                      <th style={{ padding: '8px' }}>Numéro</th>
                      <th style={{ padding: '8px' }}>Client</th>
                      <th style={{ padding: '8px' }}>Sous-total</th>
                      <th style={{ padding: '8px' }}>Total TTC</th>
                      <th style={{ padding: '8px' }}>Actions / Statut</th>
                    </tr>
                  </thead>

                  <tbody>
                    {invoices.map(i => (
                      <tr
                        key={i.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <td style={{ padding: '8px' }}>
                          <strong>{i.invoiceNumber}</strong>
                        </td>

                        <td style={{ padding: '8px' }}>
                          {i.clientName}
                        </td>

                        <td style={{ padding: '8px' }}>
                          {Number(i.amountSubtotal).toFixed(2)} $
                        </td>

                        <td
                          style={{
                            padding: '8px',
                            fontWeight: 'bold',
                            color: 'var(--primary)',
                          }}
                        >
                          {Number(i.amountTotal).toFixed(2)} $
                        </td>

                        <td
                          style={{
                            padding: '8px',
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <button
                            onClick={() =>
                              handleToggleStatus(i.id, i.status)
                            }
                            style={{
                              padding: '4px 8px',
                              backgroundColor:
                                i.status === 'PAID'
                                  ? 'var(--success)'
                                  : 'var(--warning)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 'bold',
                            }}
                          >
                            {i.status === 'PAID'
                              ? '✅ Payée'
                              : '⏳ En attente'}
                          </button>

                          <button
                            onClick={() => handlePrintInvoice(i)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'var(--primary)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 'bold',
                            }}
                          >
                            🖨️ Imprimer / PDF
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteInvoice(i.id)
                            }
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'var(--danger)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 'bold',
                            }}
                          >
                            🗑️ Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
          Chargement du tableau de bord...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}