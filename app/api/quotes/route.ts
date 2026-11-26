import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import {
  InputError,
  text,
  clientIdValue,
  validUntilValue,
} from "@/lib/validation";
import { calculateDocument } from "@/lib/money";
export async function GET() {
  try {
    const userId = await requireUser();
    const quotes =
      await getDb()`SELECT q.*,COALESCE(q."clientSnapshot"->>'name',c.name) AS "clientName",COALESCE(q."clientSnapshot"->>'email',c.email) AS "clientEmail"
      FROM "Quote" q JOIN "Client" c ON c.id=q."clientId" AND c."userId"=q."userId" WHERE q."userId"=${userId} ORDER BY q."createdAt" DESC`;
    return NextResponse.json({ quotes });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const userId = await requireUser(),
      b = await readJson(request),
      sql = getDb();
    const clientId = clientIdValue(b.clientId),
      validUntil = validUntilValue(b.validUntil),
      notes = text(b.notes, "Notes", 5000);
    const [user] =
      await sql`SELECT "tpsNumber","tvqNumber" FROM "User" WHERE id=${userId}`;
    const doc = calculateDocument(b.items, {
      tps: Boolean(user.tpsNumber),
      tvq: Boolean(user.tvqNumber),
    });
    const rows = await sql`WITH counter AS (
      UPDATE "User" SET "quoteSequence"="quoteSequence"+1 WHERE id=${userId} AND EXISTS(SELECT 1 FROM "Client" WHERE id=${clientId} AND "userId"=${userId}) RETURNING "quoteSequence")
      INSERT INTO "Quote" (id,"quoteNumber","amountSubtotal","tpsAmount","tvqAmount","amountTotal",items,status,"validUntil",notes,"createdAt","updatedAt","userId","clientId")
      SELECT ${crypto.randomUUID()},'SOU-'||to_char(CURRENT_DATE,'YYYY')||'-'||lpad("quoteSequence"::text,GREATEST(6,length("quoteSequence"::text)),'0'),${doc.amountSubtotal},${doc.tpsAmount},${doc.tvqAmount},${doc.amountTotal},${JSON.stringify(doc.items)}::jsonb,'DRAFT',${validUntil}::date,${notes},NOW(),NOW(),${userId},${clientId} FROM counter RETURNING *`;
    if (!rows.length) throw new InputError("Client introuvable.", 404);
    return NextResponse.json({ quote: rows[0] }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE() {
  try {
    const id = await requireUser();
    const rows =
      await getDb()`DELETE FROM "Quote" WHERE "userId"=${id} AND status='DRAFT' RETURNING id`;
    return NextResponse.json({
      deletedCount: rows.length,
      message: "Brouillons supprimés.",
    });
  } catch (error) {
    return apiError(error);
  }
}
