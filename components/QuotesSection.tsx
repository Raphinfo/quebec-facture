"use client";
import { useCallback, useEffect, useState } from "react";
import { calculateDocument } from "@/lib/money";
import { printDocument } from "@/lib/print";
type Item = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
  isTpsApplicable?: boolean;
  isTvqApplicable?: boolean;
};
type Profile = {
  companyName?: string;
  companyAddress?: string;
  tpsNumber?: string;
  tvqNumber?: string;
  companyLogo?: string;
};
type Quote = {
  id: string;
  quoteNumber: string;
  clientId: number;
  clientName: string;
  clientEmail: string;
  items: Item[];
  status: string;
  validUntil: string | null;
  notes: string;
  createdAt: string;
  version: number;
  amountSubtotal: number;
  tpsAmount: number;
  tvqAmount: number;
  amountTotal: number;
  issuerSnapshot?: Profile | null;
};
type Client = { id: number; name: string };
const blank = (): Item => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
  isTpsApplicable: true,
  isTvqApplicable: true,
});
const labels: Record<string, string> = {
  DRAFT: "Brouillon",
  SENDING: "Envoi à confirmer",
  SENT: "Envoyée",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  EXPIRED: "Expirée",
  CONVERTED: "Convertie",
};
const money = (n: number) =>
  Number(n).toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
      method,
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    }),
    d = await res.json();
  if (!res.ok) throw new Error(d.error || "Opération impossible.");
  return d;
}
export default function QuotesSection() {
  const [quotes, setQuotes] = useState<Quote[]>([]),
    [clients, setClients] = useState<Client[]>([]),
    [profile, setProfile] = useState<Profile>({}),
    [editing, setEditing] = useState<Quote | null>(null),
    [clientId, setClientId] = useState(""),
    [items, setItems] = useState<Item[]>([blank()]),
    [notes, setNotes] = useState(""),
    [validUntil, setValidUntil] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(
    () =>
      Promise.all([
        api<{ quotes: Quote[] }>("/api/quotes"),
        api<Client[]>("/api/clients"),
        api<Profile>("/api/profile"),
      ])
        .then(([q, c, p]) => {
          setQuotes(q.quotes);
          setClients(c);
          setProfile(p);
        })
        .catch((e) =>
          setError(e instanceof Error ? e.message : "Chargement impossible."),
        )
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opération impossible.");
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setEditing(null);
    setClientId("");
    setItems([blank()]);
    setNotes("");
    setValidUntil("");
  }
  function edit(q: Quote) {
    setEditing(q);
    setClientId(String(q.clientId));
    setItems(q.items);
    setNotes(q.notes || "");
    setValidUntil(q.validUntil?.slice(0, 10) || "");
    document
      .getElementById("quote-editor")
      ?.scrollIntoView({ behavior: "smooth" });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      await api(
        editing ? `/api/quotes/${editing.id}` : "/api/quotes",
        editing ? "PATCH" : "POST",
        {
          clientId,
          items,
          notes,
          validUntil: validUntil || null,
          status: "DRAFT",
          version: editing?.version,
        },
      );
      reset();
      setMessage("Brouillon enregistré. Vérifiez-le avant de l’envoyer.");
    });
  }
  function print(q: Quote) {
    const p = q.issuerSnapshot || profile;
    try {
      printDocument(
        {
          number: q.quoteNumber,
          date: new Date(q.createdAt).toLocaleDateString("fr-CA"),
          clientName: q.clientName,
          items: q.items,
          subtotal: q.amountSubtotal,
          tps: q.tpsAmount,
          tvq: q.tvqAmount,
          total: q.amountTotal,
          ...p,
          notes: `${q.validUntil ? "Valide jusqu’au " + q.validUntil.slice(0, 10) + "\n" : ""}${q.notes || ""}`,
        },
        "Soumission",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impression impossible.");
    }
  }
  let summary = {
    amountSubtotal: 0,
    tpsAmount: 0,
    tvqAmount: 0,
    amountTotal: 0,
  };
  try {
    summary = calculateDocument(items, {
      tps: Boolean(profile.tpsNumber),
      tvq: Boolean(profile.tvqNumber),
    });
  } catch {}
  return (
    <>
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="notice success">
          {message}
        </div>
      )}
      <section className="panel" id="quote-editor">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">PRÉPAREZ VOTRE PROCHAIN PROJET</span>
            <h2>
              {editing
                ? `Modifier ${editing.quoteNumber}`
                : "Nouvelle soumission"}
            </h2>
          </div>
          {editing && (
            <button className="text-link" onClick={reset}>
              Annuler la modification
            </button>
          )}
        </div>
        <form className="form-stack document-form" onSubmit={save}>
          <fieldset className="form-section">
            <legend>Client et validité</legend>
            <div className="two-fields">
              <label>
                Client
                <select
                  aria-label="Client"
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">Choisir un client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date de validité
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </label>
            </div>
          </fieldset>
          <fieldset className="form-section">
            <legend>Prestations</legend>
            {items.map((item, index) => (
              <div className="invoice-line-editor" key={index}>
                <div className="quote-lines">
                  <label>
                    Description
                    <input
                      required
                      maxLength={1000}
                      value={item.description}
                      onChange={(e) =>
                        setItems(
                          items.map((v, i) =>
                            i === index
                              ? { ...v, description: e.target.value }
                              : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Quantité
                    <input
                      required
                      type="number"
                      min="0.001"
                      max="1000000"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) =>
                        setItems(
                          items.map((v, i) =>
                            i === index
                              ? { ...v, quantity: Number(e.target.value) }
                              : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Prix CAD
                    <input
                      required
                      type="number"
                      min="0"
                      max="99999999"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        setItems(
                          items.map((v, i) =>
                            i === index
                              ? { ...v, unitPrice: Number(e.target.value) }
                              : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="line-options">
                    {(["isTpsApplicable", "isTvqApplicable"] as const).map(
                      (key, k) => (
                        <label className="checkbox-label" key={key}>
                          <input
                            type="checkbox"
                            checked={item[key] !== false}
                            disabled={
                              !profile[k === 0 ? "tpsNumber" : "tvqNumber"]
                            }
                            onChange={(e) =>
                              setItems(
                                items.map((v, i) =>
                                  i === index
                                    ? { ...v, [key]: e.target.checked }
                                    : v,
                                ),
                              )
                            }
                          />
                          {k === 0 ? "TPS" : "TVQ"}
                        </label>
                      ),
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-link"
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems(items.filter((_, i) => i !== index))
                    }
                  >
                    Retirer
                  </button>
                </div>
              </div>
            ))}
            <button
              className="button secondary"
              type="button"
              disabled={items.length >= 100}
              onClick={() => setItems([...items, blank()])}
            >
              + Ajouter une ligne
            </button>
          </fieldset>
          <fieldset className="form-section">
            <legend>Notes</legend>
            <label>
              Notes et conditions
              <textarea
                rows={3}
                maxLength={5000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </fieldset>
          <fieldset className="form-section document-summary">
            <legend>Récapitulatif</legend>
            <div className="summary-breakdown">
              <p>
                <span>Sous-total</span>
                <span>{money(summary.amountSubtotal)}</span>
              </p>
              <p>
                <span>TPS</span>
                <span>{money(summary.tpsAmount)}</span>
              </p>
              <p>
                <span>TVQ</span>
                <span>{money(summary.tvqAmount)}</span>
              </p>
            </div>
            <div className="document-submit">
              <div className="grand-total">
                <span>Total CAD</span>
                <strong>{money(summary.amountTotal)}</strong>
              </div>
              <button className="button primary" disabled={busy}>
                {busy ? "Enregistrement…" : "Enregistrer le brouillon"}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">DU PREMIER ÉCHANGE À LA FACTURE</span>
            <h2>Vos soumissions</h2>
          </div>
          <button
            className="text-link danger-text"
            disabled={busy || !quotes.some((q) => q.status === "DRAFT")}
            onClick={() => {
              if (confirm("Supprimer tous les brouillons ?"))
                void action(async () => {
                  await api("/api/quotes", "DELETE");
                  reset();
                  setMessage("Brouillons supprimés.");
                });
            }}
          >
            Vider les brouillons
          </button>
        </div>
        <p className="field-help">
          Après envoi, le contenu est figé. Marquez une soumission acceptée
          uniquement après avoir reçu l’accord du client. La conversion conserve
          les montants proposés.
        </p>
        {loading ? (
          <p>Chargement…</p>
        ) : !quotes.length ? (
          <div className="empty-state">
            <h3>Vos prochains projets commencent ici.</h3>
            <p>
              Préparez votre première soumission dans le formulaire ci-dessus.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Client</th>
                  <th>Total</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <strong>{q.quoteNumber}</strong>
                      <small>
                        {q.validUntil
                          ? `Valide jusqu’au ${q.validUntil.slice(0, 10)}`
                          : "Sans échéance"}
                      </small>
                    </td>
                    <td>{q.clientName}</td>
                    <td>{money(q.amountTotal)}</td>
                    <td>
                      <span
                        className={`status-badge ${q.status.toLowerCase()}`}
                      >
                        {labels[q.status] || q.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="text-link" onClick={() => print(q)}>
                          Imprimer
                        </button>
                        {q.status === "DRAFT" && (
                          <>
                            <button
                              className="text-link"
                              disabled={busy}
                              onClick={() => edit(q)}
                            >
                              Modifier
                            </button>
                            <button
                              className="text-link danger-text"
                              disabled={busy}
                              onClick={() => {
                                if (confirm("Supprimer ce brouillon ?"))
                                  void action(async () => {
                                    await api(`/api/quotes/${q.id}`, "DELETE");
                                    if (editing?.id === q.id) reset();
                                  });
                              }}
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                        {["DRAFT", "SENDING"].includes(q.status) && (
                          <button
                            className="button primary small-button"
                            disabled={busy}
                            onClick={() => {
                              if (
                                confirm(
                                  `Envoyer cette soumission à ${q.clientEmail || "l’adresse du client"} ? Son contenu sera figé.`,
                                )
                              )
                                void action(async () => {
                                  await api(`/api/quotes/${q.id}`, "POST");
                                  setMessage("Soumission envoyée.");
                                });
                            }}
                          >
                            {q.status === "SENDING"
                              ? "Reprendre l’envoi"
                              : "Envoyer"}
                          </button>
                        )}
                        {q.status === "SENT" &&
                          ["ACCEPTED", "REJECTED", "EXPIRED"].map((status) => (
                            <button
                              key={status}
                              className="text-link"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Marquer la soumission « ${labels[status]} » ?`,
                                  )
                                )
                                  void action(async () => {
                                    await api(`/api/quotes/${q.id}`, "PATCH", {
                                      status,
                                      version: q.version,
                                    });
                                  });
                              }}
                            >
                              {labels[status]}
                            </button>
                          ))}
                        {q.status === "ACCEPTED" && (
                          <button
                            className="button primary small-button"
                            disabled={busy}
                            onClick={() =>
                              void action(async () => {
                                const result = await api<{
                                  invoiceNumber: string;
                                }>(`/api/quotes/${q.id}/convert`, "POST");
                                setMessage(
                                  `Facture ${result.invoiceNumber} créée. Retrouvez-la dans Facturation.`,
                                );
                              })
                            }
                          >
                            Convertir en facture
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
