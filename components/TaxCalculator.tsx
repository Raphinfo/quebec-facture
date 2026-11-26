"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;
const COMBINED_FACTOR = 1 + TPS_RATE + TVQ_RATE; // 1.14975

const roundCents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) =>
  n.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });

export default function TaxCalculator({
  authenticated = false,
}: {
  authenticated?: boolean;
}) {
  const [amountInput, setAmountInput] = useState("1000");
  const [mode, setMode] = useState<"before" | "after">("before");
  const [applyTps, setApplyTps] = useState(true);
  const [applyTvq, setApplyTvq] = useState(true);

  const result = useMemo(() => {
    const raw = Number(String(amountInput).replace(",", "."));
    if (!Number.isFinite(raw) || raw < 0) {
      return { subtotal: 0, tps: 0, tvq: 0, total: 0 };
    }
    const factor =
      1 + (applyTps ? TPS_RATE : 0) + (applyTvq ? TVQ_RATE : 0);

    if (mode === "before") {
      const subtotal = roundCents(raw);
      const tps = applyTps ? roundCents(subtotal * TPS_RATE) : 0;
      const tvq = applyTvq ? roundCents(subtotal * TVQ_RATE) : 0;
      return { subtotal, tps, tvq, total: roundCents(subtotal + tps + tvq) };
    } else {
      const total = roundCents(raw);
      const subtotal = roundCents(total / factor);
      const tps = applyTps ? roundCents(subtotal * TPS_RATE) : 0;
      const tvq = applyTvq ? roundCents(subtotal * TVQ_RATE) : 0;
      return { subtotal, tps, tvq, total };
    }
  }, [amountInput, mode, applyTps, applyTvq]);

  return (
    <div className="calc-card">
      <div className="calc-mode-tabs" role="tablist" aria-label="Mode de calcul">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "before"}
          className={mode === "before" ? "active" : ""}
          onClick={() => setMode("before")}
        >
          Ajouter les taxes (HT → TTC)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "after"}
          className={mode === "after" ? "active" : ""}
          onClick={() => setMode("after")}
        >
          Extraire les taxes (TTC → HT)
        </button>
      </div>

      <div className="calc-body">
        <div className="calc-inputs">
          <label>
            {mode === "before"
              ? "Montant avant taxes (CAD)"
              : "Montant total taxes incluses (CAD)"}
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="1000.00"
            />
          </label>
          <div className="calc-quick-amounts">
            {[100, 500, 1000, 2500, 5000].map((val) => (
              <button
                key={val}
                type="button"
                className="chip-button"
                onClick={() => setAmountInput(String(val))}
              >
                {val} $
              </button>
            ))}
          </div>
          <div className="calc-toggles">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={applyTps}
                onChange={(e) => setApplyTps(e.target.checked)}
              />
              TPS (5 %)
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={applyTvq}
                onChange={(e) => setApplyTvq(e.target.checked)}
              />
              TVQ (9,975 %)
            </label>
          </div>
        </div>

        <div className="calc-results">
          <div className="document-totals">
            <p>
              <span>Montant avant taxes</span>
              <strong>{fmt(result.subtotal)}</strong>
            </p>
            <p>
              <span>TPS (5 %)</span>
              <span>{fmt(result.tps)}</span>
            </p>
            <p>
              <span>TVQ (9,975 %)</span>
              <span>{fmt(result.tvq)}</span>
            </p>
            <p>
              <span>Total des taxes ({((COMBINED_FACTOR - 1) * 100).toFixed(3).replace(".", ",")} %)</span>
              <span>{fmt(roundCents(result.tps + result.tvq))}</span>
            </p>
            <p>
              <strong>Total avec taxes</strong>
              <strong>{fmt(result.total)}</strong>
            </p>
          </div>
          <div className="calc-cta">
            <Link
              href={authenticated ? "/dashboard?tab=billing" : "/register"}
              className="button primary"
            >
              {authenticated
                ? "Créer une facture maintenant →"
                : "Transformer en vraie facture PDF →"}
            </Link>
            <small className="muted">
              {authenticated
                ? "TPS (5 %) et TVQ (9,975 %) appliquées automatiquement selon votre profil"
                : "3 factures gratuites · Calculs TPS/TVQ automatiques et Virement Interac"}
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
