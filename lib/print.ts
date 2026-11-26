import { escapeHtml, safeLogo } from "./validation";

type Printable = {
  number: string;
  date: string;
  dueDate?: string;
  clientName: string;
  clientCompany?: string;
  items: {
    description: string;
    amount?: number;
    total?: number;
    quantity?: number;
    unitPrice?: number;
  }[];
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  companyName?: string;
  companyAddress?: string;
  tpsNumber?: string;
  tvqNumber?: string;
  companyLogo?: string;
  interacEmail?: string;
  notes?: string;
};

export function printDocument(doc: Printable, kind = "Facture") {
  const w = window.open("", "_blank");
  if (!w)
    throw new Error(
      "Autorisez les fenêtres surgissantes pour imprimer ce document.",
    );
  w.opener = null;
  let logo = "";
  try {
    logo = safeLogo(doc.companyLogo);
  } catch {
    /* Un ancien logo non sûr n’est pas imprimé. */
  }
  const e = escapeHtml,
    money = (n: number) =>
      Number(n).toLocaleString("fr-CA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  w.document.write(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><title>${e(kind)} ${e(doc.number)}</title><style>body{font:14px system-ui,-apple-system,sans-serif;color:#111827;padding:40px;line-height:1.6}header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #1d4ed8;padding-bottom:24px}h1{font-size:30px;margin:0 0 6px}img{max-width:160px;max-height:70px;margin-bottom:10px}table{width:100%;border-collapse:collapse;margin:28px 0}th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#4b5563;background:#f8fafc}td,th{padding:12px;border-bottom:1px solid #e5e7eb;text-align:left}.right{text-align:right}.totals{max-width:300px;margin-left:auto}.totals p{display:flex;justify-content:space-between;margin:5px 0;color:#4b5563}.total{font-size:19px;font-weight:700;color:#1d4ed8;border-top:2px solid #e5e7eb;padding-top:10px;margin-top:10px}.payment-box{margin-top:28px;padding:14px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:13px;color:#1e3a8a}footer{white-space:pre-wrap;margin-top:24px;color:#4b5563;font-size:13px}@media print{body{padding:0}tr{break-inside:avoid}}</style></head><body><header><div>${logo ? `<img alt="Logo" src="${e(logo)}">` : ""}<h1>${e(kind)}</h1><p>${e(doc.number)}<br>Émise le ${e(doc.date)}${doc.dueDate ? `<br>Échéance : <strong>${e(doc.dueDate)}</strong>` : ""}</p></div><div class="right"><strong>${e(doc.companyName)}</strong><p>${e(doc.companyAddress)}</p>${doc.tpsNumber ? `<p>TPS : ${e(doc.tpsNumber)}</p>` : ""}${doc.tvqNumber ? `<p>TVQ : ${e(doc.tvqNumber)}</p>` : ""}</div></header><h3>Destinataire</h3><p>${e(doc.clientName)}${doc.clientCompany ? `<br>${e(doc.clientCompany)}` : ""}</p><table><thead><tr><th>Description</th><th class="right">Quantité</th><th class="right">Montant CAD</th></tr></thead><tbody>${doc.items.map((i) => `<tr><td>${e(i.description)}</td><td class="right">${e(i.quantity ?? 1)}</td><td class="right">${money(i.amount ?? i.total ?? Number(i.quantity) * Number(i.unitPrice))}</td></tr>`).join("")}</tbody></table><div class="totals"><p><span>Sous-total</span><span>${money(doc.subtotal)} $</span></p><p><span>TPS</span><span>${money(doc.tps)} $</span></p><p><span>TVQ</span><span>${money(doc.tvq)} $</span></p><p class="total"><span>Total CAD</span><span>${money(doc.total)} $</span></p></div>${doc.interacEmail ? `<div class="payment-box"><strong>Paiement par Virement Interac</strong><br>Courriel : ${e(doc.interacEmail)} · Référence : ${e(doc.number)}</div>` : ""}<footer>${e(doc.notes)}</footer></body></html>`,
  );
  w.document.close();
  const images = Array.from(w.document.images);
  void Promise.all(
    images.map((img) => img.decode().catch(() => undefined)),
  ).then(() => {
    w.focus();
    w.print();
  });
}
