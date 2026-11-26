"use client";
import { useMemo, useState } from "react";

type InvoiceItem = {
  id: string;
  invoiceNumber: string;
  amountSubtotal: number;
  tpsAmount: number;
  tvqAmount: number;
  amountTotal: number;
  status: string;
  createdAt: string;
};

type ExpenseItem = {
  id: string;
  description: string;
  amount: number;
  category: string;
  createdAt: string;
};

const money = (v: number) =>
  v.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });

const QUARTERS = [
  { id: "ALL", label: "Année complète" },
  { id: "Q1", label: "T1 (Jan – Mar)" },
  { id: "Q2", label: "T2 (Avr – Juin)" },
  { id: "Q3", label: "T3 (Juil – Sep)" },
  { id: "Q4", label: "T4 (Oct – Déc)" },
];

function inQuarter(dateStr: string, year: number, quarter: string): boolean {
  const d = new Date(dateStr);
  if (d.getFullYear() !== year) return false;
  if (quarter === "ALL") return true;
  const m = d.getMonth();
  if (quarter === "Q1") return m >= 0 && m <= 2;
  if (quarter === "Q2") return m >= 3 && m <= 5;
  if (quarter === "Q3") return m >= 6 && m <= 8;
  return m >= 9 && m <= 11;
}

export default function TaxReportSection({
  invoices,
  expenses,
}: {
  invoices: InvoiceItem[];
  expenses: ExpenseItem[];
}) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const i of invoices) set.add(new Date(i.createdAt).getFullYear());
    for (const e of expenses) set.add(new Date(e.createdAt).getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [invoices, expenses, currentYear]);

  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState("ALL");
  const [paidOnly, setPaidOnly] = useState(false);

  const summary = useMemo(() => {
    const filteredInvoices = invoices.filter(
      (i) =>
        i.status !== "CANCELED" &&
        (!paidOnly || i.status === "PAID") &&
        inQuarter(i.createdAt, year, quarter),
    );
    const filteredExpenses = expenses.filter((e) =>
      inQuarter(e.createdAt, year, quarter),
    );

    const salesSubtotal = filteredInvoices.reduce(
      (sum, i) => sum + Number(i.amountSubtotal),
      0,
    );
    const tpsCollected = filteredInvoices.reduce(
      (sum, i) => sum + Number(i.tpsAmount),
      0,
    );
    const tvqCollected = filteredInvoices.reduce(
      (sum, i) => sum + Number(i.tvqAmount),
      0,
    );
    const salesTotal = filteredInvoices.reduce(
      (sum, i) => sum + Number(i.amountTotal),
      0,
    );
    const expensesTotal = filteredExpenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );

    const byCategory = new Map<string, number>();
    for (const e of filteredExpenses) {
      byCategory.set(
        e.category,
        (byCategory.get(e.category) || 0) + Number(e.amount),
      );
    }

    return {
      count: filteredInvoices.length,
      salesSubtotal,
      tpsCollected,
      tvqCollected,
      salesTotal,
      expensesTotal,
      expensesCount: filteredExpenses.length,
      netEstimate: salesSubtotal - expensesTotal,
      categories: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [invoices, expenses, year, quarter, paidOnly]);

  return (
    <div className="reports-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">PRÉPARATION REVENU QUÉBEC & ARC</span>
            <h2>Sommaire fiscal TPS / TVQ</h2>
          </div>
          <div className="table-actions">
            <a
              href={`/api/export/csv?type=invoices&year=${year}`}
              className="button secondary small-button"
            >
              Factures {year} (CSV) ↓
            </a>
            <a
              href={`/api/export/csv?type=expenses&year=${year}`}
              className="button secondary small-button"
            >
              Dépenses {year} (CSV) ↓
            </a>
          </div>
        </div>

        <div className="report-filters">
          <label>
            Année
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            Période
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
            >
              {QUARTERS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-label report-checkbox">
            <input
              type="checkbox"
              checked={paidOnly}
              onChange={(e) => setPaidOnly(e.target.checked)}
            />
            Inclure uniquement les factures payées
          </label>
        </div>

        <div className="metrics report-metrics">
          <article>
            <span>Ventes avant taxes ({summary.count})</span>
            <strong>{money(summary.salesSubtotal)}</strong>
            <small>Total facturé taxes incluses : {money(summary.salesTotal)}</small>
          </article>
          <article className="metric-pending">
            <span>TPS perçue (5 %)</span>
            <strong>{money(summary.tpsCollected)}</strong>
            <small>Taxe fédérale facturée sur la période</small>
          </article>
          <article className="metric-pending">
            <span>TVQ perçue (9,975 %)</span>
            <strong>{money(summary.tvqCollected)}</strong>
            <small>Taxe du Québec facturée sur la période</small>
          </article>
          <article className={summary.netEstimate >= 0 ? "metric-paid" : ""}>
            <span>Revenu net estimé (avant impôts)</span>
            <strong>{money(summary.netEstimate)}</strong>
            <small>Ventes HT moins {money(summary.expensesTotal)} de dépenses</small>
          </article>
        </div>

        <p className="field-help">
          Ce sommaire récapitule les montants enregistrés dans votre espace
          pour faciliter votre comptabilité. Vérifiez vos crédits de taxe sur
          les intrants (CTI/RTI) avec votre comptable avant de transmettre votre
          déclaration à Revenu Québec.
        </p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">VENTILATION DES COÛTS</span>
            <h2>Dépenses par catégorie ({summary.expensesCount})</h2>
          </div>
          <strong>{money(summary.expensesTotal)}</strong>
        </div>
        {!summary.categories.length ? (
          <p className="muted">Aucune dépense enregistrée sur cette période.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th>Part des dépenses</th>
                  <th>Total CAD</th>
                </tr>
              </thead>
              <tbody>
                {summary.categories.map(([cat, amount]) => {
                  const pct =
                    summary.expensesTotal > 0
                      ? Math.round((amount / summary.expensesTotal) * 100)
                      : 0;
                  return (
                    <tr key={cat}>
                      <td>
                        <strong>{cat}</strong>
                      </td>
                      <td>{pct} %</td>
                      <td>{money(amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
