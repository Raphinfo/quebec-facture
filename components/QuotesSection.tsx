"use client";

import { useEffect, useMemo, useState } from "react";

type Client = {
  id: number;
  name: string;
  email?: string | null;
};

type QuoteItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type Quote = {
  id: string;
  quoteNumber: string;
  amountSubtotal: string | number;
  tpsAmount: string | number;
  tvqAmount: string | number;
  amountTotal: string | number;
  status: string;
  validUntil?: string | null;
  notes?: string | null;
  createdAt: string;
  clientId: number;
  clientName: string;
  clientEmail?: string | null;
  items: QuoteItem[];
};

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyée",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  EXPIRED: "Expirée",
  CONVERTED: "Convertie",
};

const allowedStatusTransitions: Record<string, string[]> = {
  DRAFT: ["DRAFT", "SENT"],
  SENT: ["SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["ACCEPTED"],
  REJECTED: ["REJECTED"],
  EXPIRED: ["EXPIRED"],
  CONVERTED: ["CONVERTED"],
};

export default function QuotesSection() {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingDrafts, setClearingDrafts] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editingQuoteNumber, setEditingQuoteNumber] = useState("");
  const [status, setStatus] = useState("DRAFT");

  const [clientId, setClientId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<QuoteItem[]>([
    {
      description: "",
      quantity: 1,
      unitPrice: 0,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);
  }, [items]);

  const tps = useMemo(() => subtotal * 0.05, [subtotal]);
  const tvq = useMemo(() => subtotal * 0.09975, [subtotal]);
  const total = useMemo(() => subtotal + tps + tvq, [subtotal, tps, tvq]);
  const draftCount = useMemo(
    () => quotes.filter((quote) => quote.status === "DRAFT").length,
    [quotes]
  );

  const loadQuotes = async () => {
    const res = await fetch("/api/quotes");

    if (!res.ok) {
      throw new Error("Impossible de charger les soumissions");
    }

    const data = await res.json();
    setQuotes(data.quotes ?? []);
  };

  const loadClients = async () => {
    const res = await fetch("/api/clients");

    if (!res.ok) {
      throw new Error("Impossible de charger les clients");
    }

    const data = await res.json();

    if (Array.isArray(data)) {
      setClients(data);
    } else if (Array.isArray(data.clients)) {
      setClients(data.clients);
    } else {
      setClients([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        setError("");

        await Promise.all([loadClients(), loadQuotes()]);
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement des données.");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  const updateItem = (
    index: number,
    field: keyof QuoteItem,
    value: string
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (field === "description") {
          return {
            ...item,
            description: value,
          };
        }

        return {
          ...item,
          [field]: Number(value),
        };
      })
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      return;
    }

    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const resetForm = () => {
    setEditingQuoteId(null);
    setEditingQuoteNumber("");
    setStatus("DRAFT");
    setClientId("");
    setValidUntil("");
    setNotes("");
    setItems([
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const startEditQuote = (quote: Quote) => {
    if (quote.status === "CONVERTED") {
      setError("Une soumission convertie ne peut plus être modifiée.");
      return;
    }

    setMessage("");
    setError("");
    setEditingQuoteId(quote.id);
    setEditingQuoteNumber(quote.quoteNumber);
    setStatus(quote.status || "DRAFT");
    setClientId(String(quote.clientId));
    setNotes(quote.notes ?? "");

    if (quote.validUntil) {
      const date = new Date(quote.validUntil);
      setValidUntil(Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10));
    } else {
      setValidUntil("");
    }

    const normalizedItems = Array.isArray(quote.items)
      ? quote.items.map((item) => ({
          description: String(item.description ?? ""),
          quantity: Number(item.quantity ?? 1),
          unitPrice: Number(item.unitPrice ?? 0),
        }))
      : [];

    setItems(
      normalizedItems.length > 0
        ? normalizedItems
        : [{ description: "", quantity: 1, unitPrice: 0 }]
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitQuote = async (event: React.FormEvent) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!clientId) {
      setError("Sélectionne un client.");
      return;
    }

    const hasEmptyDescription = items.some(
      (item) => !item.description.trim()
    );

    if (hasEmptyDescription) {
      setError("Chaque ligne doit avoir une description.");
      return;
    }

    try {
      setLoading(true);

      const isEditing = Boolean(editingQuoteId);
      const endpoint = isEditing
        ? `/api/quotes/${editingQuoteId}`
        : "/api/quotes";

      const res = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: Number(clientId),
          items,
          validUntil: validUntil || null,
          notes: notes || null,
          status: isEditing ? status : "DRAFT",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            (isEditing
              ? "Erreur lors de la modification."
              : "Erreur lors de la création.")
        );
      }

      if (isEditing) {
        setMessage(
          `Soumission ${editingQuoteNumber} mise à jour avec succès.`
        );
      } else {
        setMessage(
          `Soumission ${data.quote?.quoteNumber ?? ""} créée avec succès.`
        );
      }

      resetForm();
      await loadQuotes();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : editingQuoteId
            ? "Erreur lors de la modification de la soumission."
            : "Erreur lors de la création de la soumission."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value: string | number) => {
    return Number(value || 0).toLocaleString("fr-CA", {
      style: "currency",
      currency: "CAD",
    });
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const statusLabel = (quoteStatus: string) => {
    switch (quoteStatus) {
      case "DRAFT":
        return "Brouillon";
      case "SENT":
        return "Envoyée";
      case "ACCEPTED":
        return "Acceptée";
      case "REJECTED":
        return "Refusée";
      case "EXPIRED":
        return "Expirée";
      case "CONVERTED":
        return "Convertie";
      default:
        return quoteStatus;
    }
  };

  const deleteQuote = async (quote: Quote) => {
    const confirmed = window.confirm(
      `Supprimer définitivement la soumission ${quote.quoteNumber} ?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(quote.id);
      setMessage("");
      setError("");

      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la suppression.");
      }

      if (editingQuoteId === quote.id) {
        resetForm();
      }

      setMessage(
        data.message || `Soumission ${quote.quoteNumber} supprimée avec succès.`
      );

      await loadQuotes();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la suppression de la soumission."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const clearDrafts = async () => {
    if (draftCount === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Supprimer définitivement ${draftCount} brouillon${
        draftCount > 1 ? "s" : ""
      } ?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setClearingDrafts(true);
      setMessage("");
      setError("");

      const res = await fetch("/api/quotes", {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Erreur lors de la suppression des brouillons."
        );
      }

      const editedQuote = quotes.find(
        (quote) => quote.id === editingQuoteId
      );

      if (editedQuote?.status === "DRAFT") {
        resetForm();
      }

      setMessage(
        data.message || `${data.deletedCount ?? draftCount} brouillon(s) supprimé(s).`
      );

      await loadQuotes();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la suppression des brouillons."
      );
    } finally {
      setClearingDrafts(false);
    }
  };

  const convertQuoteToInvoice = async (quoteId: string) => {
    const confirmed = window.confirm(
      "Convertir cette soumission en facture ?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setConvertingId(quoteId);
      setMessage("");
      setError("");

      const res = await fetch(`/api/quotes/${quoteId}/convert`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la conversion.");
      }

      if (editingQuoteId === quoteId) {
        resetForm();
      }

      setMessage(
        `Soumission convertie en facture ${data.invoiceNumber}.`
      );

      await loadQuotes();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la conversion en facture."
      );
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <section
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "6px",
            color: "var(--foreground)",
            fontSize: "22px",
            fontWeight: 700,
          }}
        >
          {editingQuoteId
            ? `✏️ Modifier la soumission ${editingQuoteNumber}`
            : "📋 Nouvelle soumission"}
        </h2>

        <p
          style={{
            marginTop: 0,
            marginBottom: "24px",
            color: "var(--text-muted)",
            fontSize: "14px",
          }}
        >
          {editingQuoteId
            ? "Modifie les informations de la soumission puis enregistre les changements."
            : "Prépare une offre de prix pour ton client avant de créer une facture."}
        </p>

        {message && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(34, 197, 94, 0.12)",
              color: "var(--success)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              color: "var(--danger)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={submitQuote}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: editingQuoteId
                ? "repeat(auto-fit, minmax(200px, 1fr))"
                : "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "22px",
            }}
          >
            <div>
              <label style={labelStyle}>Client</label>

              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                style={inputStyle}
                disabled={loadingData}
              >
                <option value="">Sélectionner un client</option>

                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Valide jusqu&apos;au</label>

              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                style={inputStyle}
              />
            </div>

            {editingQuoteId && (
              <div>
                <label style={labelStyle}>Statut</label>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={inputStyle}
                >
                 {(
                  allowedStatusTransitions[
                    quotes.find((quote) => quote.id === editingQuoteId)?.status || "DRAFT"
                  ] || ["DRAFT"]
                ).map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {statusLabels[statusValue] || statusValue}
                  </option>
                ))}
                </select>
              </div>
            )}
          </div>

          <div
            style={{
              marginBottom: "12px",
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            Services / produits
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {items.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(240px, 1fr) 100px 140px 140px 46px",
                  gap: "10px",
                  alignItems: "end",
                }}
              >
                <div>
                  <label style={labelStyle}>Description</label>

                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="Ex. Installation, consultation..."
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Qté</label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Prix unitaire</label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, "unitPrice", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Total</label>

                  <div
                    style={{
                      ...inputStyle,
                      display: "flex",
                      alignItems: "center",
                      minHeight: "42px",
                    }}
                  >
                    {formatMoney(item.quantity * item.unitPrice)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  title="Supprimer la ligne"
                  style={{
                    height: "42px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface-soft)",
                    color:
                      items.length === 1
                        ? "var(--text-muted)"
                        : "var(--danger)",
                    cursor:
                      items.length === 1 ? "not-allowed" : "pointer",
                    fontSize: "18px",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            style={{
              marginTop: "14px",
              padding: "9px 13px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface-soft)",
              color: "var(--foreground)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            + Ajouter une ligne
          </button>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr minmax(280px, 360px)",
              gap: "24px",
              marginTop: "24px",
            }}
          >
            <div>
              <label style={labelStyle}>Notes / conditions</label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Ex. Soumission valide 30 jours..."
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            <div
              style={{
                backgroundColor: "var(--surface-soft)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "18px",
              }}
            >
              <SummaryRow
                label="Sous-total"
                value={formatMoney(subtotal)}
              />

              <SummaryRow label="TPS 5 %" value={formatMoney(tps)} />

              <SummaryRow label="TVQ 9,975 %" value={formatMoney(tvq)} />

              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  marginTop: "12px",
                  paddingTop: "12px",
                }}
              >
                <SummaryRow
                  label="Total"
                  value={formatMoney(total)}
                  strong
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "22px",
            }}
          >
            {editingQuoteId && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setMessage("");
                  setError("");
                }}
                disabled={loading}
                style={{
                  padding: "11px 18px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface-soft)",
                  color: "var(--foreground)",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                Annuler
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "11px 18px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "var(--primary)",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 700,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? editingQuoteId
                  ? "Enregistrement..."
                  : "Création..."
                : editingQuoteId
                  ? "Enregistrer les modifications"
                  : "Créer la soumission"}
            </button>
          </div>
        </form>
      </section>

      <section
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              color: "var(--foreground)",
            }}
          >
            Soumissions
          </h2>

          <button
            type="button"
            onClick={clearDrafts}
            disabled={draftCount === 0 || clearingDrafts || loading}
            style={{
              padding: "8px 11px",
              borderRadius: "7px",
              border: "1px solid rgba(239, 68, 68, 0.45)",
              backgroundColor: "rgba(239, 68, 68, 0.10)",
              color: "var(--danger)",
              cursor:
                draftCount === 0 || clearingDrafts || loading
                  ? "not-allowed"
                  : "pointer",
              fontSize: "12px",
              fontWeight: 700,
              opacity:
                draftCount === 0 || clearingDrafts || loading ? 0.55 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {clearingDrafts
              ? "Suppression..."
              : `🗑 Vider les brouillons (${draftCount})`}
          </button>
        </div>

        {loadingData ? (
          <p style={{ color: "var(--text-muted)" }}>
            Chargement...
          </p>
        ) : quotes.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>
            Aucune soumission pour le moment.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "900px",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "var(--surface-soft)",
                  }}
                >
                  <Th>Numéro</Th>
                  <Th>Client</Th>
                  <Th>Date</Th>
                  <Th>Valide jusqu&apos;au</Th>
                  <Th>Statut</Th>
                  <Th align="right">Total</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>

              <tbody>
                {quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    style={{
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <Td>
                      <strong>{quote.quoteNumber}</strong>
                    </Td>

                    <Td>{quote.clientName}</Td>

                    <Td>{formatDate(quote.createdAt)}</Td>

                    <Td>{formatDate(quote.validUntil)}</Td>

                    <Td>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "5px 9px",
                          borderRadius: "999px",
                          backgroundColor: "var(--surface-soft)",
                          border: "1px solid var(--border)",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        {statusLabel(quote.status)}
                      </span>
                    </Td>

                    <Td align="right">
                      <strong>{formatMoney(quote.amountTotal)}</strong>
                    </Td>

                    <Td align="right">
                      {quote.status === "CONVERTED" ? (
                        <span
                          style={{
                            color: "var(--success)",
                            fontSize: "13px",
                            fontWeight: 700,
                          }}
                        >
                          ✓ Facture créée
                        </span>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => startEditQuote(quote)}
                            disabled={loading || convertingId === quote.id}
                            style={{
                              padding: "8px 11px",
                              borderRadius: "7px",
                              border: "1px solid var(--border)",
                              backgroundColor: "var(--surface-soft)",
                              color: "var(--foreground)",
                              cursor:
                                loading || convertingId === quote.id
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "12px",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              opacity:
                                loading || convertingId === quote.id ? 0.65 : 1,
                            }}
                          >
                            Modifier
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteQuote(quote)}
                            disabled={
                              deletingId === quote.id ||
                              convertingId === quote.id ||
                              loading ||
                              clearingDrafts
                            }
                            style={{
                              padding: "8px 11px",
                              borderRadius: "7px",
                              border: "1px solid rgba(239, 68, 68, 0.45)",
                              backgroundColor: "rgba(239, 68, 68, 0.10)",
                              color: "var(--danger)",
                              cursor:
                                deletingId === quote.id ||
                                convertingId === quote.id ||
                                loading ||
                                clearingDrafts
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "12px",
                              fontWeight: 700,
                              opacity:
                                deletingId === quote.id ||
                                convertingId === quote.id ||
                                loading ||
                                clearingDrafts
                                  ? 0.65
                                  : 1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {deletingId === quote.id
                              ? "Suppression..."
                              : "Supprimer"}
                          </button>

                         {quote.status === "ACCEPTED" ? (
                          <button
                            type="button"
                            onClick={() => convertQuoteToInvoice(quote.id)}
                            disabled={convertingId === quote.id || loading}
                            style={{
                              padding: "8px 11px",
                              borderRadius: "7px",
                              border: "none",
                              backgroundColor: "var(--primary)",
                              color: "#fff",
                              cursor:
                                convertingId === quote.id || loading
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "12px",
                              fontWeight: 700,
                              opacity:
                                convertingId === quote.id || loading
                                  ? 0.65
                                  : 1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {convertingId === quote.id
                              ? "Conversion..."
                              : "Convertir en facture"}
                          </button>
                        ) : (
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "12px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Acceptation requise
                          </span> 
                        )}
                        </div>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
        marginBottom: "8px",
        fontWeight: strong ? 700 : 500,
        fontSize: strong ? "17px" : "14px",
        color: "var(--foreground)",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "12px",
        color: "var(--text-muted)",
        fontSize: "12px",
        fontWeight: 700,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      style={{
        textAlign: align,
        padding: "14px 12px",
        color: "var(--foreground)",
        fontSize: "14px",
      }}
    >
      {children}
    </td>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  color: "var(--foreground)",
  fontSize: "13px",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 11px",
  borderRadius: "8px",
  border: "1px solid var(--border)",
  backgroundColor: "var(--surface-soft)",
  color: "var(--foreground)",
  outline: "none",
  boxSizing: "border-box",
};
