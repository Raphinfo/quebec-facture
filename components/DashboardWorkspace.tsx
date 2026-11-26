"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import QuotesSection from "./QuotesSection";
import TaxReportSection from "./TaxReportSection";
import ThemeToggle from "./ThemeToggle";
import ClientDrawer, { type CreatedClient } from "./ClientDrawer";
import CompanyLogoUpload from "./CompanyLogoUpload";
import SubscriptionPanel from "./SubscriptionPanel";
import { calculateDocument } from "@/lib/money";
import { printDocument } from "@/lib/print";

type Profile = {
  emailVerifiedAt?: string | null;
  companyName: string;
  companyAddress: string;
  tpsNumber: string;
  tvqNumber: string;
  companyLogo: string;
  interacEmail: string;
  paymentTermsDays: number;
  invoicesIssued: number;
  plan: string;
  subscriptionStatus: string;
};
type Client = {
  id: number;
  name: string;
  company: string;
  email: string;
  address?: string;
  neq?: string;
  phone?: string;
};
type Line = {
  description: string;
  amount: string;
  isTpsApplicable: boolean;
  isTvqApplicable: boolean;
};
type Invoice = {
  id: string;
  invoiceNumber: string;
  amountSubtotal: number;
  tpsAmount: number;
  tvqAmount: number;
  amountTotal: number;
  status: string;
  dueDate?: string | null;
  sentAt?: string | null;
  createdAt: string;
  clientName: string;
  clientCompany: string;
  clientEmail?: string | null;
  userCompanyName: string;
  userCompanyAddress: string;
  userTpsNumber: string;
  userTvqNumber: string;
  userCompanyLogo: string;
  userInteracEmail?: string | null;
  items: {
    description: string;
    amount: number;
    quantity?: number;
    unitPrice?: number;
  }[];
};
type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  createdAt: string;
};
const money = (v: number | string) =>
  Number(v).toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
const blankLine = (): Line => ({
  description: "",
  amount: "",
  isTpsApplicable: true,
  isTvqApplicable: true,
});
const initialProfile: Profile = {
  companyName: "",
  companyAddress: "",
  tpsNumber: "",
  tvqNumber: "",
  companyLogo: "",
  interacEmail: "",
  paymentTermsDays: 30,
  invoicesIssued: 0,
  plan: "FREE",
  subscriptionStatus: "ACTIVE",
};
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (res.status === 401) {
    throw new Error("Session expirée.");
  }
  if (!res.ok)
    throw new Error(data.error || "Impossible de terminer cette opération.");
  return data as T;
}
const json = (body: unknown, method = "POST"): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
export default function DashboardWorkspace() {
  const tab = useSearchParams().get("tab") || "billing";
  const [profile, setProfile] = useState<Profile>(initialProfile),
    [clients, setClients] = useState<Client[]>([]),
    [invoices, setInvoices] = useState<Invoice[]>([]),
    [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING" | "PAID" | "CANCELED">("ALL");
  const [lines, setLines] = useState<Line[]>([blankLine()]),
    [clientId, setClientId] = useState("");
  const [savedLogo, setSavedLogo] = useState("");
  const [logoReading, setLogoReading] = useState(false);
  const [clientDrawerOpen, setClientDrawerOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<CreatedClient | null>(null);
  const [companyConfigured, setCompanyConfigured] = useState(false);
  const requestRef = useRef<{ body: string; key: string } | null>(null);
  const load = useCallback(
    () =>
      Promise.all([
        api<Profile>("/api/profile"),
        api<Client[]>("/api/clients"),
        api<Invoice[]>("/api/invoices"),
        api<Expense[]>("/api/expenses"),
      ])
        .then(([p, c, i, e]) => {
          setProfile({ ...initialProfile, ...p });
          setSavedLogo(p.companyLogo || "");
          setCompanyConfigured(
            Boolean(p.companyName?.trim() && p.companyAddress?.trim()),
          );
          setClients(c);
          setInvoices(i);
          setExpenses(e);
          setError("");
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Chargement impossible.");
        })
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    let active = true;
    const refreshCompletion = () => {
      if (document.visibilityState !== "visible") return;
      void api<Profile>("/api/profile")
        .then((saved) => {
          if (!active) return;
          setCompanyConfigured(
            Boolean(saved.companyName?.trim() && saved.companyAddress?.trim()),
          );
          setProfile((current) => ({
            ...current,
            emailVerifiedAt: saved.emailVerifiedAt,
          }));
        })
        .catch(() => {
          /* Keep the last confirmed state; the next normal load reports failures. */
        });
    };
    window.addEventListener("focus", refreshCompletion);
    document.addEventListener("visibilitychange", refreshCompletion);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshCompletion);
      document.removeEventListener("visibilitychange", refreshCompletion);
    };
  }, []);
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }
  async function issue(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      const body = JSON.stringify({ clientId, items: lines });
      if (requestRef.current?.body !== body)
        requestRef.current = { body, key: crypto.randomUUID() };
      const result = await api<{ invoiceNumber: string }>("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestRef.current.key,
        },
        body,
      });
      requestRef.current = null;
      setLines([blankLine()]);
      setClientId("");
      await load();
      setMessage(`Facture ${result.invoiceNumber} émise et conservée.`);
    });
  }
  async function updateStatus(invoice: Invoice, status: string) {
    if (
      !confirm(
        status === "PAID"
          ? "Confirmer que cette facture a été intégralement payée ?"
          : "Annuler cette facture ? Son document et son numéro seront conservés.",
      )
    )
      return;
    await action(async () => {
      await api(`/api/invoices/${invoice.id}`, json({ status }, "PATCH"));
      await load();
      setMessage("Le statut a été mis à jour.");
    });
  }
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (logoReading) return;
    await action(async () => {
      await api("/api/profile", json(profile, "PUT"));
      setSavedLogo(profile.companyLogo || "");
      setCompanyConfigured(
        Boolean(profile.companyName.trim() && profile.companyAddress.trim()),
      );
      setMessage(
        "Les informations de votre entreprise ont été enregistrées. Les documents déjà émis sont inchangés.",
      );
    });
  }
  async function addExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      b = Object.fromEntries(new FormData(form));
    await action(async () => {
      await api("/api/expenses", json(b));
      await load();
      form.reset();
      setMessage("Dépense enregistrée.");
    });
  }
  async function sendInvoice(invoice: Invoice) {
    await action(async () => {
      const result = await api<{ message: string }>(
        `/api/invoices/${invoice.id}/send`,
        { method: "POST" },
      );
      await load();
      setMessage(result.message);
    });
  }
  function print(invoice: Invoice) {
    try {
      printDocument({
        number: invoice.invoiceNumber,
        date: new Date(invoice.createdAt).toLocaleDateString("fr-CA"),
        dueDate: invoice.dueDate
          ? new Date(invoice.dueDate).toLocaleDateString("fr-CA", {
              timeZone: "UTC",
            })
          : undefined,
        clientName: invoice.clientName,
        clientCompany: invoice.clientCompany,
        items: invoice.items,
        subtotal: invoice.amountSubtotal,
        tps: invoice.tpsAmount,
        tvq: invoice.tvqAmount,
        total: invoice.amountTotal,
        companyName: invoice.userCompanyName,
        companyAddress: invoice.userCompanyAddress,
        tpsNumber: invoice.userTpsNumber,
        tvqNumber: invoice.userTvqNumber,
        companyLogo: invoice.userCompanyLogo,
        interacEmail: invoice.userInteracEmail || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impression impossible.");
    }
  }
  let preview = {
    amountSubtotal: 0,
    tpsAmount: 0,
    tvqAmount: 0,
    amountTotal: 0,
  };
  try {
    preview = calculateDocument(lines, {
      tps: Boolean(profile.tpsNumber),
      tvq: Boolean(profile.tvqNumber),
    });
  } catch {
    /* Le formulaire n’est pas encore complet. */
  }
  const paid = invoices
      .filter((i) => i.status === "PAID")
      .reduce((s, i) => s + Number(i.amountTotal), 0),
    pending = invoices
      .filter((i) => i.status === "PENDING")
      .reduce((s, i) => s + Number(i.amountTotal), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const todayIso = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Toronto",
  });
  const isPro =
    profile.plan === "PRO" &&
    ["ACTIVE", "TRIALING"].includes(profile.subscriptionStatus);
  const freeUsed = Math.min(3, Math.max(profile.invoicesIssued || 0, invoices.length));
  const titles: Record<string, string> = {
    billing: "Votre activité, en clair.",
    quotes: "Des projets qui prennent forme.",
    reports: "Vos taxes et revenus, en un coup d’œil.",
    company: "Une entreprise qui vous ressemble.",
    expenses: "Chaque dépense à sa place.",
    subscription: "Un forfait à votre rythme.",
  };
  return (
    <div className="dashboard-content">
      <header className="workspace-header">
        <div>
          <span className="eyebrow">
            {profile.companyName || "VOTRE ESPACE"}
          </span>
          <h1>{titles[tab] || "Votre espace de travail."}</h1>
          <p>
            Les bons outils pour garder le fil, du premier contact au dernier
            paiement.
          </p>
        </div>
        <ThemeToggle />
      </header>
      {error && (
        <div role="alert" className="notice error">
          {error}{" "}
          {error === "Session expirée." && (
            <Link href="/login" className="text-link">
              Se reconnecter
            </Link>
          )}
          <button type="button" onClick={() => void load()}>
            Recharger les données
          </button>
        </div>
      )}
      {message && (
        <div role="status" className="notice success">
          {message}
        </div>
      )}
      {loading ? (
        <div className="loading-state" role="status">
          <span className="loading-dot" />
          Chargement de votre espace…
        </div>
      ) : (
        <>
          {(!companyConfigured || !profile.emailVerifiedAt) && (
            <section
              className="account-setup"
              aria-labelledby="account-setup-title"
            >
              <div>
                <h2 id="account-setup-title">Finaliser votre compte</h2>
                <p>Les étapes pour préparer et envoyer vos documents.</p>
              </div>
              <ol>
                <li>
                  <span
                    className={`setup-state ${companyConfigured ? "complete" : ""}`}
                  >
                    {companyConfigured ? "✓ Terminé" : "À compléter"}
                  </span>
                  <Link href="/dashboard?tab=company" className="text-link">
                    Configurer mon entreprise
                  </Link>
                </li>
                <li>
                  <span
                    className={`setup-state ${profile.emailVerifiedAt ? "complete" : ""}`}
                  >
                    {profile.emailVerifiedAt ? "✓ Confirmé" : "À confirmer"}
                  </span>
                  {profile.emailVerifiedAt ? (
                    <span>Confirmer mon courriel</span>
                  ) : (
                    <button
                      type="button"
                      className="text-link"
                      disabled={busy}
                      onClick={() =>
                        void action(async () => {
                          const result = await api<{ message: string }>(
                            "/api/auth/send-verification",
                            { method: "POST" },
                          );
                          setMessage(result.message);
                        })
                      }
                    >
                      Confirmer mon courriel
                    </button>
                  )}
                </li>
              </ol>
            </section>
          )}
          {tab === "billing" && (
            <>
              {!isPro && (
                <section className="quota-banner" aria-label="Forfait Découverte">
                  <div>
                    <strong>Forfait Découverte · {freeUsed} / 3 factures émises</strong>
                    <p>
                      {freeUsed >= 3
                        ? "Vous avez atteint la limite gratuite. Passez Pro pour émettre sans limite."
                        : `Il vous reste ${3 - freeUsed} facture${3 - freeUsed > 1 ? "s" : ""} gratuite${3 - freeUsed > 1 ? "s" : ""}.`}
                    </p>
                  </div>
                  <div className="quota-actions">
                    <div className="quota-bar" aria-hidden="true">
                      <span style={{ width: `${(freeUsed / 3) * 100}%` }} />
                    </div>
                    <Link href="/choose-plan" className="button primary small-button">
                      Passer Pro (15 $/mois) →
                    </Link>
                  </div>
                </section>
              )}
              <section className="metrics" aria-label="Résumé de l’activité">
                <article className="metric-paid">
                  <span>Encaissé · toutes périodes</span>
                  <strong>{money(paid)}</strong>
                  <small>Factures marquées payées, taxes incluses</small>
                </article>
                <article className="metric-pending">
                  <span>À recevoir</span>
                  <strong>{money(pending)}</strong>
                  <small>Factures en attente de paiement</small>
                </article>
                <article>
                  <span>Dépenses enregistrées</span>
                  <strong>{money(totalExpenses)}</strong>
                  <small>
                    {expenses.length} dépense{expenses.length > 1 ? "s" : ""}{" "}
                    dans votre espace
                  </small>
                </article>
              </section>
              <div className="invoice-workspace">
                <section className="panel" id="create-invoice">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">UN NOUVEAU DOCUMENT</span>
                      <h2>Créer une facture</h2>
                    </div>
                    <span className="badge">CAD</span>
                  </div>
                  <form
                    className="form-stack document-form invoice-form"
                    onSubmit={issue}
                  >
                    <fieldset className="form-section">
                      <legend>Client</legend>
                      <div className="client-picker">
                        <label>
                          Destinataire
                          <select
                            aria-label="Destinataire"
                            required
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                          >
                            <option value="">Choisir un client</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                                {c.company ? ` · ${c.company}` : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="button secondary"
                          aria-haspopup="dialog"
                          onClick={() => {
                            setEditingClient(null);
                            setClientDrawerOpen(true);
                          }}
                        >
                          + Nouveau client
                        </button>
                      </div>
                    </fieldset>
                    <fieldset className="form-section">
                      <legend>Prestations</legend>
                      {lines.map((line, index) => (
                        <div className="invoice-line-editor" key={index}>
                          <div className="line-fields">
                            <label>
                              Service ou produit
                              <input
                                required
                                maxLength={1000}
                                placeholder="Ex. Consultation et accompagnement"
                                value={line.description}
                                onChange={(e) =>
                                  setLines(
                                    lines.map((l, i) =>
                                      i === index
                                        ? { ...l, description: e.target.value }
                                        : l,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              Montant CAD
                              <input
                                type="number"
                                min="0"
                                max="99999999"
                                step="0.01"
                                required
                                value={line.amount}
                                onChange={(e) =>
                                  setLines(
                                    lines.map((l, i) =>
                                      i === index
                                        ? { ...l, amount: e.target.value }
                                        : l,
                                    ),
                                  )
                                }
                              />
                            </label>
                          </div>
                          <div className="line-options">
                            {(
                              ["isTpsApplicable", "isTvqApplicable"] as const
                            ).map((key, k) => (
                              <label className="checkbox-label" key={key}>
                                <input
                                  type="checkbox"
                                  checked={line[key]}
                                  disabled={
                                    !profile[
                                      k === 0 ? "tpsNumber" : "tvqNumber"
                                    ]
                                  }
                                  onChange={(e) =>
                                    setLines(
                                      lines.map((l, i) =>
                                        i === index
                                          ? { ...l, [key]: e.target.checked }
                                          : l,
                                      ),
                                    )
                                  }
                                />
                                {k === 0 ? "TPS" : "TVQ"}
                              </label>
                            ))}
                            {lines.length > 1 && (
                              <button
                                type="button"
                                className="text-link"
                                onClick={() =>
                                  setLines(lines.filter((_, i) => i !== index))
                                }
                              >
                                Retirer la ligne
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="button secondary"
                        disabled={lines.length >= 100}
                        onClick={() => setLines([...lines, blankLine()])}
                      >
                        + Ajouter une ligne
                      </button>
                    </fieldset>
                    <fieldset className="form-section document-summary">
                      <legend>Récapitulatif</legend>
                      <div className="document-totals">
                        <p>
                          <span>Sous-total</span>
                          <span>{money(preview.amountSubtotal)}</span>
                        </p>
                        <p>
                          <span>TPS / TVQ</span>
                          <span>
                            {money(preview.tpsAmount + preview.tvqAmount)}
                          </span>
                        </p>
                        <p>
                          <strong>Total</strong>
                          <strong>{money(preview.amountTotal)}</strong>
                        </p>
                      </div>
                      <p className="field-help">
                        Les taxes sont calculées selon les numéros renseignés
                        dans votre profil et les cases cochées. Une facture
                        émise est conservée et ne peut pas être supprimée.
                      </p>
                      <button
                        className="button primary"
                        disabled={busy || !clients.length}
                      >
                        {busy ? "Enregistrement…" : "Émettre la facture →"}
                      </button>
                    </fieldset>
                  </form>
                </section>
                <ClientDrawer
                  open={clientDrawerOpen}
                  client={editingClient}
                  onClose={() => {
                    setClientDrawerOpen(false);
                    setEditingClient(null);
                  }}
                  onCreated={(client, mode) => {
                    setClients((current) => [
                      client,
                      ...current.filter(
                        (existing) => existing.id !== client.id,
                      ),
                    ]);
                    setClientId(String(client.id));
                    setMessage(
                      mode === "edit"
                        ? "Les coordonnées du client ont été mises à jour."
                        : "Votre client a été ajouté et sélectionné.",
                    );
                  }}
                />
                <details className="client-directory">
                  <summary>Carnet de clients ({clients.length})</summary>
                  <div className="client-list">
                    {clients.map((c) => (
                      <div key={c.id}>
                        <span className="avatar">
                          {c.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          <strong>{c.name}</strong>
                          <small>
                            {c.email || c.company || "Client enregistré"}
                          </small>
                        </span>
                        <div className="client-item-actions">
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => {
                              setEditingClient(c);
                              setClientDrawerOpen(true);
                            }}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Supprimer ${c.name}`}
                            onClick={() => {
                              if (
                                confirm(
                                  "Supprimer ce client ? Les clients liés à des documents sont conservés.",
                                )
                              )
                                void action(async () => {
                                  await api(`/api/clients/${c.id}`, {
                                    method: "DELETE",
                                  });
                                  await load();
                                });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">VOTRE HISTORIQUE</span>
                    <h2>Les factures</h2>
                  </div>
                  <label className="search-field">
                    <span className="sr-only">Rechercher une facture</span>
                    <input
                      placeholder="Rechercher un client ou un numéro…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                {!invoices.length ? (
                  <div className="empty-state">
                    <span>▤</span>
                    <h3>Votre première facture vous attend.</h3>
                    <p>
                      Ajoutez un client, décrivez votre service et créez votre
                      premier document.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="status-filters" role="group" aria-label="Filtrer par statut">
                      {(
                        [
                          ["ALL", `Toutes (${invoices.length})`],
                          ["ACTIVE", `Actives (${invoices.filter((i) => i.status !== "CANCELED").length})`],
                          ["PENDING", `En attente (${invoices.filter((i) => i.status === "PENDING").length})`],
                          ["PAID", `Payées (${invoices.filter((i) => i.status === "PAID").length})`],
                          ["CANCELED", `Annulées (${invoices.filter((i) => i.status === "CANCELED").length})`],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          className={`chip-button ${statusFilter === id ? "active" : ""}`}
                          aria-pressed={statusFilter === id}
                          onClick={() => setStatusFilter(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Document</th>
                          <th>Client</th>
                          <th>Montant</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices
                          .filter((i) => {
                            if (statusFilter === "ACTIVE" && i.status === "CANCELED") return false;
                            if (statusFilter === "PENDING" && i.status !== "PENDING") return false;
                            if (statusFilter === "PAID" && i.status !== "PAID") return false;
                            if (statusFilter === "CANCELED" && i.status !== "CANCELED") return false;
                            return `${i.invoiceNumber} ${i.clientName}`
                              .toLowerCase()
                              .includes(query.toLowerCase());
                          })
                          .map((i) => {
                            const dueIso = i.dueDate
                              ? String(i.dueDate).slice(0, 10)
                              : null;
                            const overdue =
                              i.status === "PENDING" &&
                              Boolean(dueIso && dueIso < todayIso);
                            return (
                              <tr key={i.id}>
                                <td>
                                  <strong>{i.invoiceNumber}</strong>
                                  <small>
                                    {new Date(i.createdAt).toLocaleDateString(
                                      "fr-CA",
                                    )}
                                    {dueIso
                                      ? ` · Éch. ${new Date(`${dueIso}T00:00:00Z`).toLocaleDateString("fr-CA", { timeZone: "UTC" })}`
                                      : ""}
                                  </small>
                                </td>
                                <td>
                                  {i.clientName}
                                  {i.sentAt && (
                                    <small>
                                      Envoyée le{" "}
                                      {new Date(i.sentAt).toLocaleDateString(
                                        "fr-CA",
                                      )}
                                    </small>
                                  )}
                                </td>
                                <td>{money(i.amountTotal)}</td>
                                <td>
                                  <span
                                    className={`status-badge ${overdue ? "past_due" : i.status.toLowerCase()}`}
                                  >
                                    {i.status === "PAID"
                                      ? "Payée"
                                      : i.status === "CANCELED"
                                        ? "Annulée"
                                        : overdue
                                          ? "En retard"
                                          : "En attente"}
                                  </span>
                                </td>
                                <td>
                                  <div className="table-actions">
                                    <a
                                      href={`/api/invoices/${i.id}/pdf`}
                                      className="button secondary small-button"
                                    >
                                      PDF ↓
                                    </a>
                                    <button
                                      type="button"
                                      className="button secondary small-button"
                                      onClick={() => print(i)}
                                    >
                                      Imprimer
                                    </button>
                                    {i.status !== "CANCELED" && (
                                      <button
                                        type="button"
                                        disabled={busy}
                                        className="button secondary small-button"
                                        onClick={() => void sendInvoice(i)}
                                      >
                                        {i.sentAt ? "Renvoyer" : "Envoyer"}
                                      </button>
                                    )}
                                    {i.status === "PENDING" && (
                                      <>
                                        <button
                                          type="button"
                                          disabled={busy}
                                          className="text-link"
                                          onClick={() =>
                                            void updateStatus(i, "PAID")
                                          }
                                        >
                                          Marquer payée
                                        </button>
                                        <button
                                          type="button"
                                          disabled={busy}
                                          className="text-link danger-text"
                                          onClick={() =>
                                            void updateStatus(i, "CANCELED")
                                          }
                                        >
                                          Annuler
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
          {tab === "quotes" && (
            <div className="quotes-panel">
              <QuotesSection />
            </div>
          )}
          {tab === "reports" && (
            <TaxReportSection invoices={invoices} expenses={expenses} />
          )}
          {["company", "profile", "settings"].includes(tab) && (
            <section className="panel profile-panel">
              <span className="eyebrow">L’IDENTITÉ DE VOS DOCUMENTS</span>
              <h2>Votre entreprise</h2>
              <p className="muted">
                Ces informations seront utilisées pour vos prochains documents.
              </p>
              <form className="form-stack" onSubmit={saveProfile}>
                <label>
                  Nom de l’entreprise
                  <input
                    required
                    maxLength={200}
                    value={profile.companyName || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, companyName: e.target.value })
                    }
                  />
                </label>
                <label>
                  Adresse complète
                  <textarea
                    required
                    maxLength={500}
                    rows={3}
                    value={profile.companyAddress || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, companyAddress: e.target.value })
                    }
                  />
                </label>
                <div className="two-fields">
                  <label>
                    Numéro de TPS
                    <input
                      placeholder="123456789RT0001"
                      value={profile.tpsNumber || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, tpsNumber: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Numéro de TVQ
                    <input
                      placeholder="1234567890TQ0001"
                      value={profile.tvqNumber || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, tvqNumber: e.target.value })
                      }
                    />
                  </label>
                </div>
                <p className="field-help">
                  Laissez le champ vide si la taxe correspondante ne s’applique
                  pas à votre entreprise. Faites confirmer votre situation
                  fiscale au besoin.
                </p>
                <div className="two-fields">
                  <label>
                    Courriel pour Virement Interac (facultatif)
                    <input
                      type="email"
                      placeholder="paiements@monentreprise.ca"
                      value={profile.interacEmail || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, interacEmail: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Délai de paiement par défaut (jours)
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={profile.paymentTermsDays ?? 30}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          paymentTermsDays: Number(e.target.value || 0),
                        })
                      }
                    />
                  </label>
                </div>
                <p className="field-help">
                  Votre courriel Interac s’affichera automatiquement dans les
                  instructions de paiement sur vos factures imprimées et envoyées.
                </p>
                <CompanyLogoUpload
                  value={profile.companyLogo || ""}
                  savedValue={savedLogo}
                  disabled={busy}
                  onReadingChange={setLogoReading}
                  onChange={(companyLogo) =>
                    setProfile((current) => ({ ...current, companyLogo }))
                  }
                />
                <button
                  className="button primary"
                  disabled={busy || logoReading}
                >
                  Enregistrer mon entreprise
                </button>
              </form>
            </section>
          )}
          {tab === "expenses" && (
            <>
              <section className="panel">
                <span className="eyebrow">LES SORTIES DE VOTRE ACTIVITÉ</span>
                <h2>Enregistrer une dépense</h2>
                <form onSubmit={addExpense} className="expense-form">
                  <label>
                    Description
                    <input name="description" maxLength={1000} required />
                  </label>
                  <label>
                    Montant CAD
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="99999999.99"
                      required
                    />
                  </label>
                  <label>
                    Catégorie
                    <select name="category">
                      <option>Général</option>
                      <option>Matériel</option>
                      <option>Logiciels</option>
                      <option>Déplacements</option>
                      <option>Services professionnels</option>
                    </select>
                  </label>
                  <button disabled={busy} className="button primary">
                    Enregistrer
                  </button>
                </form>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Vos dépenses</h2>
                  <strong>{money(totalExpenses)}</strong>
                </div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Catégorie</th>
                        <th>Date</th>
                        <th>Montant</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id}>
                          <td>{e.description}</td>
                          <td>{e.category}</td>
                          <td>
                            {new Date(e.createdAt).toLocaleDateString("fr-CA")}
                          </td>
                          <td>{money(e.amount)}</td>
                          <td>
                            <button
                              className="text-link danger-text"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  confirm(
                                    "Supprimer cette dépense saisie par erreur ?",
                                  )
                                )
                                  void action(async () => {
                                    await api(`/api/expenses/${e.id}`, {
                                      method: "DELETE",
                                    });
                                    await load();
                                  });
                              }}
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!expenses.length && (
                    <p className="empty-state">
                      Aucune dépense enregistrée pour le moment.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
          {tab === "subscription" && <SubscriptionPanel />}
          {tab === "privacy" && (
            <section className="panel">
              <h2>Vos données et votre confidentialité</h2>
              <p>
                Retrouvez notre politique et téléchargez une copie de vos
                données.
              </p>
              <div className="table-actions">
                <Link
                  className="button secondary"
                  href="/politique-de-confidentialite"
                >
                  Lire la politique
                </Link>
                <a href="/api/export" className="button primary">
                  Exporter mes données
                </a>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
