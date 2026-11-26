import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/http";
import { InputError } from "@/lib/validation";
import { generateDocumentPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  try {
    const userId = await requireUser();
    const { id } = await params;
    const sql = getDb();

    const [inv] = await sql`
      SELECT i.id, i.number AS "invoiceNumber", i.status, i."dueDate", i."createdAt",
        COALESCE(i."amountSubtotal", i."sousTotal") AS "amountSubtotal",
        COALESCE(i."tpsAmount", i."totalTPS") AS "tpsAmount",
        COALESCE(i."tvqAmount", i."totalTVQ") AS "tvqAmount",
        COALESCE(i."amountTotal", i."totalGlobal") AS "amountTotal",
        COALESCE(i.items::jsonb, i."itemsJson"::jsonb) AS items,
        COALESCE(i."clientSnapshot"->>'name', i."clientName") AS "clientName",
        COALESCE(i."clientSnapshot"->>'company', i."clientCompany") AS "clientCompany",
        COALESCE(NULLIF(i."clientSnapshot"->>'address',''), NULLIF(i."clientAddress",'')) AS "clientAddress",
        COALESCE(NULLIF(i."clientSnapshot"->>'email',''), NULLIF(i."clientEmail",'')) AS "clientEmail",
        i."issuerSnapshot"->>'companyName' AS "companyName",
        i."issuerSnapshot"->>'companyAddress' AS "companyAddress",
        i."issuerSnapshot"->>'tpsNumber' AS "tpsNumber",
        i."issuerSnapshot"->>'tvqNumber' AS "tvqNumber",
        i."issuerSnapshot"->>'companyLogo' AS "companyLogo",
        COALESCE(NULLIF(i."issuerSnapshot"->>'interacEmail',''), NULLIF(u."interacEmail",'')) AS "interacEmail"
      FROM "Invoice" i
      JOIN "User" u ON u.id = i."userId"
      WHERE i.id=${id} AND i."userId"=${userId}
    `;

    if (!inv) throw new InputError("Facture introuvable.", 404);

    const pdfBytes = await generateDocumentPdf({
      kind: "Facture",
      number: inv.invoiceNumber,
      date: new Date(inv.createdAt).toLocaleDateString("fr-CA"),
      dueDate: inv.dueDate
        ? new Date(inv.dueDate).toLocaleDateString("fr-CA", { timeZone: "UTC" })
        : undefined,
      status: inv.status,
      companyName: inv.companyName || undefined,
      companyAddress: inv.companyAddress || undefined,
      tpsNumber: inv.tpsNumber || undefined,
      tvqNumber: inv.tvqNumber || undefined,
      companyLogo: inv.companyLogo || undefined,
      interacEmail: inv.interacEmail || undefined,
      clientName: inv.clientName,
      clientCompany: inv.clientCompany || undefined,
      clientAddress: inv.clientAddress || undefined,
      clientEmail: inv.clientEmail || undefined,
      items: Array.isArray(inv.items) ? inv.items : [],
      subtotal: Number(inv.amountSubtotal),
      tps: Number(inv.tpsAmount),
      tvq: Number(inv.tvqAmount),
      total: Number(inv.amountTotal),
    });

    const safeName = String(inv.invoiceNumber).replace(/[^A-Za-z0-9_-]/g, "_");
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
