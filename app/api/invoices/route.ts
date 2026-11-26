import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError, text, clientIdValue } from "@/lib/validation";
import { calculateDocument } from "@/lib/money";

export async function POST(request: Request) {
  try {
    const userId = await requireUser();
    const body = await readJson(request);
    const clientId = clientIdValue(body.clientId);
    const sql = getDb();
    const [user] =
      await sql`SELECT "tpsNumber","tvqNumber" FROM "User" WHERE id=${userId}`;
    const document = calculateDocument(body.items, {
      tps: Boolean(user.tpsNumber),
      tvq: Boolean(user.tvqNumber),
    });
    const key = text(
      request.headers.get("idempotency-key"),
      "Clé de requête",
      100,
      true,
    );
    const rows =
      await sql`SELECT qf_issue_invoice(${userId},${clientId},${JSON.stringify(document)}::jsonb,NULL,${key}) AS result`;
    const result = rows[0].result;
    if (result.error) throw new InputError(result.error, result.status);
    return NextResponse.json(
      { ...result, message: "Facture émise." },
      { status: result.replayed ? 200 : 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function GET() {
  try {
    const userId = await requireUser();
    const rows =
      await getDb()`SELECT id,"clientId",number AS "invoiceNumber",COALESCE("amountSubtotal","sousTotal") AS "amountSubtotal",
      COALESCE("tpsAmount","totalTPS") AS "tpsAmount",COALESCE("tvqAmount","totalTVQ") AS "tvqAmount",
      COALESCE("amountTotal","totalGlobal") AS "amountTotal",status,"dueDate","sentAt",COALESCE(items::jsonb,"itemsJson"::jsonb) AS items,"createdAt","updatedAt",
      COALESCE("clientSnapshot"->>'name',"clientName") AS "clientName",COALESCE("clientSnapshot"->>'company',"clientCompany") AS "clientCompany",
      COALESCE(NULLIF("clientSnapshot"->>'email',''),NULLIF("clientEmail",'')) AS "clientEmail",
      "issuerSnapshot"->>'companyName' AS "userCompanyName","issuerSnapshot"->>'companyAddress' AS "userCompanyAddress",
      "issuerSnapshot"->>'tpsNumber' AS "userTpsNumber","issuerSnapshot"->>'tvqNumber' AS "userTvqNumber",
      "issuerSnapshot"->>'companyLogo' AS "userCompanyLogo","issuerSnapshot"->>'interacEmail' AS "userInteracEmail"
      FROM "Invoice" WHERE "userId"=${userId} ORDER BY "createdAt" DESC`;
    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error);
  }
}
