import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get("user_session")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

const quotes = await sql`
  SELECT
    q."id",
    q."quoteNumber",
    q."amountSubtotal",
    q."tpsAmount",
    q."tvqAmount",
    q."amountTotal",
    q."items",
    q."status",
    q."validUntil",
    q."notes",
    q."createdAt",
    q."updatedAt",
    q."clientId",
    c."name" AS "clientName",
    c."email" AS "clientEmail"
  FROM "Quote" q
  INNER JOIN "Client" c
    ON c."id" = q."clientId"
  WHERE q."userId" = ${userId}
  ORDER BY q."createdAt" DESC
`;

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error("GET /api/quotes error:", error);

    return NextResponse.json(
      { error: "Erreur lors du chargement des soumissions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get("user_session")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      clientId,
      items,
      validUntil,
      notes,
      status = "DRAFT",
    } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "Le client est requis" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Au moins une ligne est requise" },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "DRAFT",
      "SENT",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
      "CONVERTED",
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Statut invalide" },
        { status: 400 }
      );
    }

    const clientRows = await sql`
      SELECT "id"
      FROM "Client"
      WHERE "id" = ${Number(clientId)}
        AND "userId" = ${userId}
      LIMIT 1
    `;

    if (clientRows.length === 0) {
      return NextResponse.json(
        { error: "Client introuvable" },
        { status: 404 }
      );
    }

    let amountSubtotal = 0;

    const normalizedItems = items.map((item: any) => {
      const description = String(item.description ?? "").trim();
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? item.amount ?? 0);

      if (!description) {
        throw new Error("Chaque ligne doit avoir une description");
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        throw new Error("Ligne de soumission invalide");
      }

      const total = quantity * unitPrice;

      amountSubtotal += total;

      return {
        description,
        quantity,
        unitPrice,
        total,
      };
    });

    amountSubtotal = Number(amountSubtotal.toFixed(2));

    const tpsAmount = Number((amountSubtotal * 0.05).toFixed(2));
    const tvqAmount = Number((amountSubtotal * 0.09975).toFixed(2));
    const amountTotal = Number(
      (amountSubtotal + tpsAmount + tvqAmount).toFixed(2)
    );

    const countRows = await sql`
      SELECT COUNT(*)::int AS count
      FROM "Quote"
      WHERE "userId" = ${userId}
    `;

    const nextNumber = Number(countRows[0]?.count ?? 0) + 1;

    const quoteNumber =
      "SOU-" +
      new Date().getFullYear() +
      "-" +
      String(nextNumber).padStart(4, "0");

    const quoteId = crypto.randomUUID();

    const result = await sql`
      INSERT INTO "Quote" (
        "id",
        "quoteNumber",
        "amountSubtotal",
        "tpsAmount",
        "tvqAmount",
        "amountTotal",
        "items",
        "status",
        "validUntil",
        "notes",
        "createdAt",
        "updatedAt",
        "userId",
        "clientId"
      )
      VALUES (
        ${quoteId},
        ${quoteNumber},
        ${amountSubtotal},
        ${tpsAmount},
        ${tvqAmount},
        ${amountTotal},
        ${JSON.stringify(normalizedItems)}::jsonb,
        ${status}::"QuoteStatus",
        ${validUntil ? new Date(validUntil).toISOString() : null},
        ${notes?.trim() || null},
        NOW(),
        NOW(),
        ${userId},
        ${Number(clientId)}
      )
      RETURNING *
    `;

    return NextResponse.json(
      { quote: result[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/quotes error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erreur lors de la création de la soumission";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}