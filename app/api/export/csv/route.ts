import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/http";
import { InputError } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

function csvCell(value: unknown): string {
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((r) => r.map(csvCell).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUser();
    await rateLimit(`export-csv:${userId}`, 20, 3600);
    const type = request.nextUrl.searchParams.get("type") || "invoices";
    if (!["invoices", "expenses"].includes(type)) {
      throw new InputError("Type d’export invalide.");
    }
    const yearParam = request.nextUrl.searchParams.get("year");
    const year = yearParam ? Number(yearParam) : null;
    if (yearParam && (!Number.isInteger(year) || year! < 2000 || year! > 2100)) {
      throw new InputError("Année invalide.");
    }

    const sql = getDb();
    let content = "";
    let filename = "";

    if (type === "invoices") {
      const rows = year
        ? await sql`SELECT number, COALESCE("clientSnapshot"->>'name',"clientName") AS "clientName", COALESCE("clientSnapshot"->>'company',"clientCompany") AS "clientCompany", status, COALESCE("amountSubtotal","sousTotal") AS subtotal, COALESCE("tpsAmount","totalTPS") AS tps, COALESCE("tvqAmount","totalTVQ") AS tvq, COALESCE("amountTotal","totalGlobal") AS total, "createdAt", "dueDate" FROM "Invoice" WHERE "userId"=${userId} AND EXTRACT(YEAR FROM "createdAt")=${year} ORDER BY "createdAt" DESC`
        : await sql`SELECT number, COALESCE("clientSnapshot"->>'name',"clientName") AS "clientName", COALESCE("clientSnapshot"->>'company',"clientCompany") AS "clientCompany", status, COALESCE("amountSubtotal","sousTotal") AS subtotal, COALESCE("tpsAmount","totalTPS") AS tps, COALESCE("tvqAmount","totalTVQ") AS tvq, COALESCE("amountTotal","totalGlobal") AS total, "createdAt", "dueDate" FROM "Invoice" WHERE "userId"=${userId} ORDER BY "createdAt" DESC`;

      const statusLabels: Record<string, string> = {
        PAID: "Payée",
        PENDING: "En attente",
        CANCELED: "Annulée",
      };
      content = toCsv(
        [
          "Numéro",
          "Date d'émission",
          "Échéance",
          "Client",
          "Entreprise cliente",
          "Statut",
          "Sous-total CAD",
          "TPS CAD",
          "TVQ CAD",
          "Total CAD",
        ],
        rows.map((r) => [
          r.number,
          new Date(r.createdAt).toISOString().slice(0, 10),
          r.dueDate ? new Date(r.dueDate).toISOString().slice(0, 10) : "",
          r.clientName,
          r.clientCompany || "",
          statusLabels[r.status] || r.status,
          Number(r.subtotal).toFixed(2),
          Number(r.tps).toFixed(2),
          Number(r.tvq).toFixed(2),
          Number(r.total).toFixed(2),
        ]),
      );
      filename = year
        ? `quebec-facture-factures-${year}.csv`
        : "quebec-facture-factures.csv";
    } else {
      const rows = year
        ? await sql`SELECT description, category, amount, "createdAt" FROM "Expense" WHERE "userId"=${userId} AND EXTRACT(YEAR FROM "createdAt")=${year} ORDER BY "createdAt" DESC`
        : await sql`SELECT description, category, amount, "createdAt" FROM "Expense" WHERE "userId"=${userId} ORDER BY "createdAt" DESC`;

      content = toCsv(
        ["Date", "Catégorie", "Description", "Montant CAD"],
        rows.map((r) => [
          new Date(r.createdAt).toISOString().slice(0, 10),
          r.category,
          r.description,
          Number(r.amount).toFixed(2),
        ]),
      );
      filename = year
        ? `quebec-facture-depenses-${year}.csv`
        : "quebec-facture-depenses.csv";
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
