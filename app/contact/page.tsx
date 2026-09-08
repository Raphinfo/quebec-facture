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

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStatus("success");

      setFormData({
        name: "",
        email: "",
        subject: "support",
        message: "",
      });
    } catch (error) {
      setStatus("error");
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    backgroundColor: "var(--surface-soft)",
    color: "var(--foreground)",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--foreground)",
    marginBottom: "6px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        padding: "48px 24px",
        transition:
          "background-color 0.25s ease, color 0.25s ease",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {/* En-tête */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "48px",
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: "12px",
              fontSize: "36px",
              fontWeight: 800,
              color: "var(--foreground)",
            }}
          >
            Contactez l'équipe Québec Facture 📬
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "18px",
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            Une question sur votre abonnement, une suggestion ou un besoin
            d'assistance ? Nous sommes là pour vous aider.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(240px, 1fr) minmax(0, 2fr)",
            gap: "32px",
            alignItems: "stretch",
          }}
        >
          {/* Bloc Coordonnées & Support */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              color: "var(--foreground)",
            }}
          >
            <div>
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: "16px",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--foreground)",
                }}
              >
                Informations
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  fontSize: "14px",
                  color: "var(--text-muted)",
                }}
              >
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "var(--foreground)",
                    }}
                  >
                    📍 Localisation :
                  </strong>

                  <span>Matane, Québec, Canada</span>
                </div>

                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "var(--foreground)",
                    }}
                  >
                    ✉️ Courriel du support :
                  </strong>

                  <a
                    href="mailto:support@quebecfacture.com"
                    style={{
                      color: "var(--primary)",
                      textDecoration: "none",
                    }}
                  >
                    support@quebecfacture.com
                  </a>
                </div>

                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "var(--foreground)",
                    }}
                  >
                    ⏱️ Heures d'ouverture :
                  </strong>

                  <span>
                    Lundi - Vendredi : 9h00 à 17h00 (EST)
                  </span>
                </div>
              </div>
            </div>

            {/* Note Conformité Loi 25 */}
            <div
              style={{
                marginTop: "32px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
                fontSize: "12px",
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              <strong
                style={{
                  display: "block",
                  marginBottom: "4px",
                  color: "var(--foreground)",
                }}
              >
                🔒 Confidentialité (Loi 25) :
              </strong>

              Vos données transmises via ce formulaire sont strictement
              utilisées pour répondre à votre demande.
            </div>
          </div>

          {/* Formulaire de Contact */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "32px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              color: "var(--foreground)",
            }}
          >
            {status === "success" && (
              <div
                style={{
                  marginBottom: "24px",
                  padding: "16px",
                  backgroundColor: "rgba(34, 197, 94, 0.12)",
                  border: "1px solid var(--success)",
                  color: "var(--success)",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              >
                ✅ Merci ! Votre message a bien été envoyé. Notre équipe
                vous répondra dans les plus brefs délais.
              </div>
            )}

            {status === "error" && (
              <div
                style={{
                  marginBottom: "24px",
                  padding: "16px",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid var(--danger)",
                  color: "var(--danger)",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              >
                ❌ Une erreur est survenue lors de l'envoi. Veuillez
                réessayer ou envoyer un courriel direct.
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div>
                <label style={labelStyle}>
                  Nom complet *
                </label>

                <input
                  type="text"
                  required
                  placeholder="Ex: Jean Tremblay"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Adresse courriel *
                </label>

                <input
                  type="email"
                  required
                  placeholder="nom@entreprise.ca"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Sujet *
                </label>

                <select
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subject: e.target.value,
                    })
                  }
                  style={fieldStyle}
                >
                  <option value="support">
                    Support technique
                  </option>
                  <option value="billing">
                    Facturation & Abonnement
                  </option>
                  <option value="feedback">
                    Suggestion / Amélioration
                  </option>
                  <option value="other">
                    Autre demande
                  </option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Message *
                </label>

                <textarea
                  required
                  rows={5}
                  placeholder="Décrivez clairement votre demande..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      message: e.target.value,
                    })
                  }
                  style={{
                    ...fieldStyle,
                    resize: "vertical",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor:
                    status === "loading"
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    status === "loading" ? 0.5 : 1,
                }}
              >
                {status === "loading"
                  ? "Envoi en cours..."
                  : "Envoyer le message"}
              </button>
            </form>
          </div>
        </div>

        {/* Retour */}
        <div
          style={{
            marginTop: "40px",
            textAlign: "center",
            fontSize: "14px",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              color: "var(--primary)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            ← Retour au Tableau de Bord
          </Link>
        </div>
      </div>
    </div>
  );
}