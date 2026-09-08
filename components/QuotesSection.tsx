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

export default function QuotesSection() {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [convertingId, setConvertingId] = useState<string | null>(null);
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

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: Number(clientId),
          items,
          validUntil: validUntil || null,
          notes: notes || null,
          status: "DRAFT",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la création.");
      }

      setMessage(
        `Soumission ${data.quote?.quoteNumber ?? ""} créée avec succès.`
      );

      resetForm();
      await loadQuotes();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
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

  const statusLabel = (status: string) => {
    switch (status) {
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
        return status;
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
      throw new Error(
        data.error || "Erreur lors de la conversion."
      );
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
          📋 Nouvelle soumission
        </h2>

        <p
          style={{
            marginTop: 0,
            marginBottom: "24px",
            color: "var(--text-muted)",
            fontSize: "14px",
          }}
        >
          Prépare une offre de prix pour ton client avant de créer une facture.
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
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
              marginTop: "22px",
            }}
          >
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
              {loading ? "Création..." : "Créer la soumission"}
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
        <h2
          style={{
            marginTop: 0,
            marginBottom: "18px",
            fontSize: "20px",
            color: "var(--foreground)",
          }}
        >
          Soumissions
        </h2>

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
                minWidth: "760px",
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
                      <strong>
                        {formatMoney(quote.amountTotal)}
                      </strong>
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
                      <button
                        type="button"
                        onClick={() => convertQuoteToInvoice(quote.id)}
                        disabled={convertingId === quote.id}
                        style={{
                          padding: "8px 11px",
                          borderRadius: "7px",
                          border: "none",
                          backgroundColor: "var(--primary)",
                          color: "#fff",
                          cursor:
                            convertingId === quote.id
                              ? "not-allowed"
                              : "pointer",
                          fontSize: "12px",
                          fontWeight: 700,
                          opacity:
                            convertingId === quote.id
                              ? 0.65
                              : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {convertingId === quote.id
                          ? "Conversion..."
                          : "Convertir en facture"}
                      </button>
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