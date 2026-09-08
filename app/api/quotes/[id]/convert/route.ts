import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_session")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Soumission invalide." },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Vérification de la soumission
    const quoteResult = await sql`
      SELECT
        q."id",
        q."quoteNumber",
        q."items",
        q."status",
        q."clientId",
        c."name" AS "clientName",
        c."company" AS "clientCompany"
      FROM "Quote" q
      INNER JOIN "Client" c
        ON c."id" = q."clientId"
      WHERE q."id" = ${id}
        AND q."userId" = ${userId}
      LIMIT 1
    `;

    if (quoteResult.length === 0) {
      return NextResponse.json(
        { error: "Soumission introuvable." },
        { status: 404 }
      );
    }

    const quote = quoteResult[0];

    if (quote.status === "CONVERTED") {
      return NextResponse.json(
        { error: "Cette soumission a déjà été convertie en facture." },
        { status: 409 }
      );
    }

    if (quote.status !== "ACCEPTED") {
  return NextResponse.json(
    {
      error:
        "La soumission doit être acceptée avant d'être convertie en facture.",
    },
    { status: 409 }
  );
}

    // Vérification du plan et de la limite de factures
    const userResult = await sql`
      SELECT plan
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `;

    const userPlan = userResult[0]?.plan || "FREE";

    if (userPlan === "FREE") {
      const countResult = await sql`
        SELECT COUNT(*) AS count
        FROM "Invoice"
        WHERE "userId" = ${userId}
      `;

      const currentInvoiceCount = parseInt(
        countResult[0]?.count || "0",
        10
      );

      if (currentInvoiceCount >= 3) {
        return NextResponse.json(
          {
            error:
              "Limite du plan Essai atteinte (3 factures maximum). Passez au Plan Pro pour créer des factures illimitées !",
          },
          { status: 403 }
        );
      }
    }

    let quoteItems = quote.items;

    if (typeof quoteItems === "string") {
      try {
        quoteItems = JSON.parse(quoteItems);
      } catch {
        quoteItems = [];
      }
    }

    if (!Array.isArray(quoteItems) || quoteItems.length === 0) {
      return NextResponse.json(
        { error: "La soumission ne contient aucun service." },
        { status: 400 }
      );
    }

    // Conversion vers le format utilisé actuellement par Invoice
    const invoiceItems = quoteItems.map((item: any) => {
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? 0);
      const amount = Number(
        item.total ?? quantity * unitPrice
      );

      return {
        description: String(item.description ?? "").trim(),
        amount: Number(amount.toFixed(2)),
      };
    });

    const subtotal = invoiceItems.reduce(
      (sum: number, item: any) => {
        return sum + (parseFloat(item.amount) || 0);
      },
      0
    );

    if (subtotal <= 0) {
      return NextResponse.json(
        {
          error:
            "Le montant total de la soumission doit être supérieur à 0 $.",
        },
        { status: 400 }
      );
    }

    const tps = Math.round(subtotal * 0.05 * 100) / 100;
    const tvq = Math.round(subtotal * 0.09975 * 100) / 100;
    const total =
      Math.round((subtotal + tps + tvq) * 100) / 100;

    const invoiceId = uuidv4();
    const invoiceNumber = `FAC-${Date.now()
      .toString()
      .slice(-6)}`;

    const jsonString = JSON.stringify(invoiceItems);

    await sql`
      INSERT INTO "Invoice" (
        "id",
        "number",
        "amountSubtotal",
        "sousTotal",
        "tpsAmount",
        "totalTPS",
        "tvqAmount",
        "totalTVQ",
        "amountTotal",
        "totalGlobal",
        "status",
        "clientId",
        "clientName",
        "clientCompany",
        "userId",
        "itemsJson",
        "items"
      )
      VALUES (
        ${invoiceId},
        ${invoiceNumber},
        ${subtotal},
        ${subtotal},
        ${tps},
        ${tps},
        ${tvq},
        ${tvq},
        ${total},
        ${total},
        'PENDING',
        ${quote.clientId},
        ${quote.clientName || "Client"},
        ${quote.clientCompany || null},
        ${userId},
        ${jsonString},
        ${jsonString}::jsonb
      )
    `;

    await sql`
      UPDATE "Quote"
      SET
        "status" = 'CONVERTED',
        "updatedAt" = NOW()
      WHERE "id" = ${id}
        AND "userId" = ${userId}
    `;

    return NextResponse.json(
      {
        message: "Soumission convertie en facture.",
        invoiceId,
        invoiceNumber,
        total,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "❌ ERREUR CONVERSION SOUMISSION :",
      error.message
    );

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}