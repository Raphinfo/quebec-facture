import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0b1120 0%, #1e3a8a 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            qf
          </div>
          <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>
            QuébecFacture
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: -1.5,
            }}
          >
            Facturation, soumissions &amp; TPS/TVQ pour le Québec.
          </div>
          <div style={{ fontSize: 28, color: "#cbd5e1" }}>
            PDF en pièce jointe · Virement Interac · Rapports fiscaux &amp; Export CSV
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#93c5fd",
          }}
        >
          <span>3 factures gratuites · Sans carte bancaire</span>
          <span>quebecfacture.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
