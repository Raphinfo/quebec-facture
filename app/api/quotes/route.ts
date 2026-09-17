import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

const sql = neon(process.env.DATABASE_URL!);
const statuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"];

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get("user_session")?.value;
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const quotes = await sql`
      SELECT q."id",q."quoteNumber",q."amountSubtotal",q."tpsAmount",q."tvqAmount",
        q."amountTotal",q."items",q."status",q."validUntil",q."notes",q."createdAt",
        q."updatedAt",q."clientId",c."name" AS "clientName",c."email" AS "clientEmail"
      FROM "Quote" q
      INNER JOIN "Client" c ON c."id"=q."clientId"
      WHERE q."userId"=${userId}
      ORDER BY q."createdAt" DESC
    `;
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error("GET /api/quotes error:", error);
    return NextResponse.json({ error: "Erreur lors du chargement des soumissions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get("user_session")?.value;
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { clientId, items, validUntil, notes, status = "DRAFT" } = await req.json();

    if (!clientId) return NextResponse.json({ error: "Le client est requis" }, { status: 400 });
    if (!Array.isArray(items) || !items.length)
      return NextResponse.json({ error: "Au moins une ligne est requise" }, { status: 400 });
    if (!statuses.includes(status))
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });

    // La date d'échéance ne peut pas être antérieure à aujourd'hui.
    if (validUntil) {
      const date = String(validUntil).slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime()))
        return NextResponse.json({ error: "Date de validité invalide" }, { status: 400 });
      if (date < today)
        return NextResponse.json(
          { error: "La date de validité ne peut pas être antérieure à aujourd’hui." },
          { status: 400 }
        );
    }

    const client = await sql`
      SELECT "id" FROM "Client"
      WHERE "id"=${Number(clientId)} AND "userId"=${userId}
      LIMIT 1
    `;
    if (!client.length) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

    let amountSubtotal = 0;
    const normalizedItems = items.map((item: any) => {
      const description = String(item.description ?? "").trim();
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? item.amount ?? 0);

      if (!description) throw new Error("Chaque ligne doit avoir une description");
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0)
        throw new Error("Ligne de soumission invalide");

      const total = quantity * unitPrice;
      amountSubtotal += total;
      return { description, quantity, unitPrice, total };
    });

    amountSubtotal = Number(amountSubtotal.toFixed(2));
    const tpsAmount = Number((amountSubtotal * 0.05).toFixed(2));
    const tvqAmount = Number((amountSubtotal * 0.09975).toFixed(2));
    const amountTotal = Number((amountSubtotal + tpsAmount + tvqAmount).toFixed(2));

    const year = new Date().getFullYear();
    const prefix = `SOU-${year}-`;
    const numbers = await sql`
      SELECT COALESCE(MAX(CAST(SUBSTRING("quoteNumber" FROM '[0-9]+$') AS INTEGER)),0) AS "maxNumber"
      FROM "Quote"
      WHERE "userId"=${userId} AND "quoteNumber" LIKE ${prefix + "%"}
    `;

    const quoteNumber = prefix + String(Number(numbers[0]?.maxNumber ?? 0) + 1).padStart(4, "0");
    const quoteId = crypto.randomUUID();

    const result = await sql`
      INSERT INTO "Quote" (
        "id","quoteNumber","amountSubtotal","tpsAmount","tvqAmount","amountTotal",
        "items","status","validUntil","notes","createdAt","updatedAt","userId","clientId"
      ) VALUES (
        ${quoteId},${quoteNumber},${amountSubtotal},${tpsAmount},${tvqAmount},${amountTotal},
        ${JSON.stringify(normalizedItems)}::jsonb,${status}::"QuoteStatus",
        ${validUntil ? new Date(`${String(validUntil).slice(0, 10)}T00:00:00.000Z`).toISOString() : null},
        ${notes?.trim() || null},NOW(),NOW(),${userId},${Number(clientId)}
      )
      RETURNING *
    `;

    return NextResponse.json({ quote: result[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/quotes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la création de la soumission" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const userId = (await cookies()).get("user_session")?.value;
    if (!userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const db = getDb();
    const deleted = await db`
      DELETE FROM "Quote"
      WHERE "userId"=${userId} AND "status"='DRAFT'
      RETURNING "id"
    `;

    return NextResponse.json({
      message: `${deleted.length} brouillon(s) supprimé(s).`,
      deletedCount: deleted.length,
    });
  } catch (error: any) {
    console.error("❌ ERREUR SUPPRESSION BROUILLONS :", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la suppression des brouillons." },
      { status: 500 }
    );
  }
}