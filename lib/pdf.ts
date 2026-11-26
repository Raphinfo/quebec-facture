import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { safeLogo } from "./validation";

export type PdfDocumentItem = {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  total?: number;
};

export type PdfDocumentInput = {
  kind: "Facture" | "Soumission";
  number: string;
  date: string;
  dueDate?: string;
  status?: string;
  companyName?: string;
  companyAddress?: string;
  tpsNumber?: string;
  tvqNumber?: string;
  companyLogo?: string;
  interacEmail?: string;
  clientName: string;
  clientCompany?: string;
  clientAddress?: string;
  clientEmail?: string;
  items: PdfDocumentItem[];
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  notes?: string;
};

function normalizePdfText(input: unknown, font: PDFFont): string {
  const replaced = String(input ?? "")
    .replace(/[\u00a0\u202f\u2007\u2009]/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, "-")
    .replace(/…/g, "...")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ");

  try {
    font.encodeText(replaced);
    return replaced;
  } catch {
    let out = "";
    for (const ch of replaced) {
      if (ch === "\n") {
        out += ch;
        continue;
      }
      try {
        font.encodeText(ch);
        out += ch;
      } catch {
        /* Ignorer les caractères hors encodage WinAnsi (ex. émojis). */
      }
    }
    return out;
  }
}

function wrapLines(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const clean = normalizePdfText(text, font);
  const paragraphs = clean.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push("");
      continue;
    }
    const words = trimmed.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        if (font.widthOfTextAtSize(word, size) <= maxWidth) {
          current = word;
        } else {
          let chunk = "";
          for (const ch of word) {
            const next = chunk + ch;
            if (font.widthOfTextAtSize(next, size) > maxWidth && chunk) {
              lines.push(chunk);
              chunk = ch;
            } else {
              chunk = next;
            }
          }
          current = chunk;
        }
      }
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : [""];
}

function fmtMoney(n: number, font: PDFFont): string {
  const formatted = Number(n ?? 0).toLocaleString("fr-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return normalizePdfText(`${formatted} $`, font);
}

export async function generateDocumentPdf(
  doc: PdfDocumentInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.kind} ${doc.number}`);
  pdf.setCreator("Québec Facture");

  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 46;
  const contentWidth = pageWidth - margin * 2;

  const colors = {
    ink: rgb(0.06, 0.09, 0.16),
    muted: rgb(0.35, 0.41, 0.5),
    border: rgb(0.86, 0.89, 0.93),
    surfaceSoft: rgb(0.96, 0.97, 0.99),
    primary: rgb(0.11, 0.31, 0.85),
    primarySoft: rgb(0.93, 0.96, 1),
    success: rgb(0.02, 0.47, 0.34),
    successSoft: rgb(0.92, 0.99, 0.96),
  };

  let page: PDFPage = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 40;

  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - 48;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < 56) newPage();
  };

  // Bande supérieure bleue
  page.drawRectangle({
    x: 0,
    y: pageHeight - 8,
    width: pageWidth,
    height: 8,
    color: colors.primary,
  });

  // Logo facultatif (PNG ou JPEG)
  let logoHeight = 0;
  if (doc.companyLogo) {
    try {
      const safe = safeLogo(doc.companyLogo);
      if (safe.startsWith("data:image/png;base64,")) {
        const bytes = Buffer.from(safe.slice("data:image/png;base64,".length), "base64");
        const img = await pdf.embedPng(bytes);
        const scale = Math.min(130 / img.width, 46 / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, { x: margin, y: y - h, width: w, height: h });
        logoHeight = h + 10;
      } else if (safe.startsWith("data:image/jpeg;base64,")) {
        const bytes = Buffer.from(safe.slice("data:image/jpeg;base64,".length), "base64");
        const img = await pdf.embedJpg(bytes);
        const scale = Math.min(130 / img.width, 46 / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, { x: margin, y: y - h, width: w, height: h });
        logoHeight = h + 10;
      }
    } catch {
      /* Ignorer un logo non supporté dans le PDF sans bloquer l'envoi. */
    }
  }

  const headerTop = y;
  let leftY = headerTop - logoHeight;

  page.drawText(normalizePdfText(doc.kind.toUpperCase(), fontBold), {
    x: margin,
    y: leftY - 20,
    size: 22,
    font: fontBold,
    color: colors.ink,
  });
  leftY -= 38;

  page.drawText(normalizePdfText(doc.number, fontBold), {
    x: margin,
    y: leftY,
    size: 11,
    font: fontBold,
    color: colors.primary,
  });
  leftY -= 15;

  page.drawText(normalizePdfText(`Date d'émission : ${doc.date}`, fontRegular), {
    x: margin,
    y: leftY,
    size: 9.5,
    font: fontRegular,
    color: colors.muted,
  });
  leftY -= 14;

  if (doc.dueDate) {
    const dueLabel =
      doc.kind === "Soumission"
        ? `Valide jusqu'au : ${doc.dueDate}`
        : `Échéance : ${doc.dueDate}`;
    page.drawText(normalizePdfText(dueLabel, fontRegular), {
      x: margin,
      y: leftY,
      size: 9.5,
      font: fontRegular,
      color: colors.muted,
    });
    leftY -= 14;
  }

  if (doc.status === "PAID") {
    page.drawRectangle({
      x: margin,
      y: leftY - 6,
      width: 56,
      height: 18,
      color: colors.successSoft,
    });
    page.drawText("PAYEE", {
      x: margin + 10,
      y: leftY - 1,
      size: 9,
      font: fontBold,
      color: colors.success,
    });
    leftY -= 20;
  }

  // Colonne droite : informations de l'entreprise
  let rightY = headerTop - 8;
  const rightColMaxWidth = 230;
  const drawRightLine = (txt: string, font: PDFFont, size: number, color = colors.muted) => {
    const clean = normalizePdfText(txt, font);
    const width = font.widthOfTextAtSize(clean, size);
    page.drawText(clean, {
      x: pageWidth - margin - width,
      y: rightY,
      size,
      font,
      color,
    });
    rightY -= size + 4;
  };

  if (doc.companyName) {
    for (const l of wrapLines(doc.companyName, fontBold, 11.5, rightColMaxWidth)) {
      drawRightLine(l, fontBold, 11.5, colors.ink);
    }
  }
  if (doc.companyAddress) {
    for (const l of wrapLines(doc.companyAddress, fontRegular, 9.5, rightColMaxWidth)) {
      drawRightLine(l, fontRegular, 9.5);
    }
  }
  if (doc.tpsNumber) drawRightLine(`TPS : ${doc.tpsNumber}`, fontRegular, 9);
  if (doc.tvqNumber) drawRightLine(`TVQ : ${doc.tvqNumber}`, fontRegular, 9);

  y = Math.min(leftY, rightY) - 18;

  // Ligne de séparation
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: colors.border,
  });
  y -= 18;

  // Bloc Destinataire
  const clientLines: string[] = [doc.clientName];
  if (doc.clientCompany) clientLines.push(doc.clientCompany);
  if (doc.clientAddress) {
    clientLines.push(...wrapLines(doc.clientAddress, fontRegular, 9.5, contentWidth - 28));
  }
  if (doc.clientEmail) clientLines.push(doc.clientEmail);

  const clientBoxHeight = 28 + clientLines.length * 14;
  page.drawRectangle({
    x: margin,
    y: y - clientBoxHeight,
    width: contentWidth,
    height: clientBoxHeight,
    color: colors.surfaceSoft,
    borderColor: colors.border,
    borderWidth: 1,
  });
  page.drawText("DESTINATAIRE", {
    x: margin + 14,
    y: y - 16,
    size: 8,
    font: fontBold,
    color: colors.primary,
  });
  let cy = y - 32;
  clientLines.forEach((line, idx) => {
    const f = idx === 0 ? fontBold : fontRegular;
    const sz = idx === 0 ? 10.5 : 9.5;
    page.drawText(normalizePdfText(line, f), {
      x: margin + 14,
      y: cy,
      size: sz,
      font: f,
      color: idx === 0 ? colors.ink : colors.muted,
    });
    cy -= 14;
  });

  y -= clientBoxHeight + 22;

  // En-tête du tableau
  const colDescX = margin + 10;
  const colDescW = 290;
  const colQtyRight = margin + 370;
  const colUnitRight = margin + 445;
  const colAmtRight = pageWidth - margin - 10;

  const drawTableHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - 24,
      width: contentWidth,
      height: 24,
      color: colors.surfaceSoft,
      borderColor: colors.border,
      borderWidth: 1,
    });
    page.drawText("DESCRIPTION", {
      x: colDescX,
      y: y - 16,
      size: 8.5,
      font: fontBold,
      color: colors.muted,
    });
    const qtyLbl = "QTE";
    page.drawText(qtyLbl, {
      x: colQtyRight - fontBold.widthOfTextAtSize(qtyLbl, 8.5),
      y: y - 16,
      size: 8.5,
      font: fontBold,
      color: colors.muted,
    });
    const unitLbl = "PRIX";
    page.drawText(unitLbl, {
      x: colUnitRight - fontBold.widthOfTextAtSize(unitLbl, 8.5),
      y: y - 16,
      size: 8.5,
      font: fontBold,
      color: colors.muted,
    });
    const amtLbl = "MONTANT CAD";
    page.drawText(amtLbl, {
      x: colAmtRight - fontBold.widthOfTextAtSize(amtLbl, 8.5),
      y: y - 16,
      size: 8.5,
      font: fontBold,
      color: colors.muted,
    });
    y -= 28;
  };

  drawTableHeader();

  for (const item of doc.items) {
    const descLines = wrapLines(item.description, fontRegular, 10, colDescW);
    const rowH = Math.max(24, descLines.length * 14 + 10);
    if (y - rowH < 72) {
      newPage();
      drawTableHeader();
    }

    let lineY = y - 14;
    for (const dl of descLines) {
      page.drawText(dl, {
        x: colDescX,
        y: lineY,
        size: 10,
        font: fontRegular,
        color: colors.ink,
      });
      lineY -= 14;
    }

    const qty = Number(item.quantity ?? 1);
    const amount = Number(
      item.amount ?? item.total ?? qty * Number(item.unitPrice ?? 0),
    );
    const unit = Number(item.unitPrice ?? (qty > 0 ? amount / qty : amount));

    const qtyText = normalizePdfText(String(qty), fontRegular);
    const unitText = fmtMoney(unit, fontRegular);
    const amtText = fmtMoney(amount, fontBold);

    page.drawText(qtyText, {
      x: colQtyRight - fontRegular.widthOfTextAtSize(qtyText, 10),
      y: y - 14,
      size: 10,
      font: fontRegular,
      color: colors.muted,
    });
    page.drawText(unitText, {
      x: colUnitRight - fontRegular.widthOfTextAtSize(unitText, 10),
      y: y - 14,
      size: 10,
      font: fontRegular,
      color: colors.muted,
    });
    page.drawText(amtText, {
      x: colAmtRight - fontBold.widthOfTextAtSize(amtText, 10),
      y: y - 14,
      size: 10,
      font: fontBold,
      color: colors.ink,
    });

    y -= rowH;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.7,
      color: colors.border,
    });
  }

  y -= 18;
  ensureSpace(120);

  // Bloc Totaux
  const totalsW = 230;
  const totalsX = pageWidth - margin - totalsW;
  const drawTotalRow = (label: string, val: string, bold = false) => {
    const f = bold ? fontBold : fontRegular;
    const sz = bold ? 11.5 : 10;
    const c = bold ? colors.primary : colors.muted;
    page.drawText(normalizePdfText(label, f), {
      x: totalsX + 10,
      y,
      size: sz,
      font: f,
      color: c,
    });
    page.drawText(val, {
      x: pageWidth - margin - 10 - f.widthOfTextAtSize(val, sz),
      y,
      size: sz,
      font: f,
      color: bold ? colors.primary : colors.ink,
    });
    y -= 18;
  };

  drawTotalRow("Sous-total", fmtMoney(doc.subtotal, fontRegular));
  drawTotalRow("TPS (5 %)", fmtMoney(doc.tps, fontRegular));
  drawTotalRow("TVQ (9,975 %)", fmtMoney(doc.tvq, fontRegular));

  page.drawRectangle({
    x: totalsX,
    y: y - 8,
    width: totalsW,
    height: 28,
    color: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 0.8,
  });
  y += 2;
  drawTotalRow("Total CAD", fmtMoney(doc.total, fontBold), true);
  y -= 12;

  // Instructions Virement Interac
  if (doc.interacEmail && doc.status !== "PAID" && doc.kind === "Facture") {
    ensureSpace(64);
    const boxH = 48;
    page.drawRectangle({
      x: margin,
      y: y - boxH,
      width: contentWidth,
      height: boxH,
      color: colors.primarySoft,
      borderColor: colors.border,
      borderWidth: 1,
    });
    page.drawText(normalizePdfText("Paiement par Virement Interac", fontBold), {
      x: margin + 12,
      y: y - 18,
      size: 10,
      font: fontBold,
      color: colors.primary,
    });
    page.drawText(
      normalizePdfText(
        `Courriel : ${doc.interacEmail}   |   Référence à indiquer : ${doc.number}`,
        fontRegular,
      ),
      {
        x: margin + 12,
        y: y - 34,
        size: 9.5,
        font: fontRegular,
        color: colors.ink,
      },
    );
    y -= boxH + 16;
  }

  // Notes facultatives
  if (doc.notes) {
    const noteLines = wrapLines(doc.notes, fontRegular, 9.5, contentWidth);
    ensureSpace(noteLines.length * 14 + 30);
    page.drawText("Notes :", {
      x: margin,
      y,
      size: 9.5,
      font: fontBold,
      color: colors.ink,
    });
    y -= 14;
    for (const nl of noteLines) {
      if (y < 52) newPage();
      page.drawText(nl, {
        x: margin,
        y,
        size: 9.5,
        font: fontRegular,
        color: colors.muted,
      });
      y -= 14;
    }
  }

  return pdf.save();
}
