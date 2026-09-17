import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
const transitions: Record<string, string[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: [], REJECTED: [], EXPIRED: [], CONVERTED: [],
};

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const userId = (await cookies()).get("user_session")?.value;
    if (!userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id: quoteId } = await params;
    if (!quoteId) return NextResponse.json({ error: "Soumission invalide." }, { status: 400 });

    const sql = getDb();
    const { clientId, items, validUntil, notes, status } = await request.json();

    const rows = await sql`
      SELECT "id","status","clientId" FROM "Quote"
      WHERE "id"=${quoteId} AND "userId"=${userId} LIMIT 1
    `;
    if (!rows.length) return NextResponse.json({ error: "Soumission introuvable." }, { status: 404 });

    const quote = rows[0], currentStatus = quote.status;
    if (currentStatus === "CONVERTED")
      return NextResponse.json(
        { error: "Une soumission déjà convertie en facture ne peut plus être modifiée." },
        { status: 409 }
      );

    if (!status || !statuses.includes(status))
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });

    if (status !== currentStatus && !transitions[currentStatus]?.includes(status))
      return NextResponse.json(
        { error: `Transition de statut interdite : ${currentStatus} → ${status}.` },
        { status: 409 }
      );

    const parsedClientId = typeof clientId === "string" ? parseInt(clientId, 10) : clientId;
    if (!Number.isInteger(parsedClientId) || parsedClientId <= 0)
      return NextResponse.json({ error: "Client invalide." }, { status: 400 });

    const client = await sql`
      SELECT "id" FROM "Client"
      WHERE "id"=${parsedClientId} AND "userId"=${userId} LIMIT 1
    `;
    if (!client.length) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });

    if (!Array.isArray(items) || !items.length)
      return NextResponse.json({ error: "Au moins une ligne est requise." }, { status: 400 });

    // Validation de la date
    let validUntilValue: string | null = null;
    if (validUntil) {
      const date = String(validUntil).slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime()))
        return NextResponse.json({ error: "Date de validité invalide." }, { status: 400 });

      if (date < today)
        return NextResponse.json(
          { error: "La date de validité ne peut pas être antérieure à aujourd’hui." },
          { status: 400 }
        );

      validUntilValue = new Date(`${date}T00:00:00.000Z`).toISOString();
    }

    let amountSubtotal = 0;
    const normalizedItems = items.map((item: any) => {
      const description = String(item.description ?? "").trim();
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? 0);

      if (!description) throw new Error("Chaque ligne doit avoir une description.");
      if (!Number.isFinite(quantity) || quantity <= 0)
        throw new Error("La quantité doit être supérieure à 0.");
      if (!Number.isFinite(unitPrice) || unitPrice < 0)
        throw new Error("Le prix unitaire est invalide.");

      const total = Number((quantity * unitPrice).toFixed(2));
      amountSubtotal += total;
      return { description, quantity, unitPrice, total };
    });

    amountSubtotal = Number(amountSubtotal.toFixed(2));
    if (amountSubtotal <= 0)
      return NextResponse.json(
        { error: "Le montant total de la soumission doit être supérieur à 0 $." },
        { status: 400 }
      );

    const tpsAmount = Number((amountSubtotal * 0.05).toFixed(2));
    const tvqAmount = Number((amountSubtotal * 0.09975).toFixed(2));
    const amountTotal = Number((amountSubtotal + tpsAmount + tvqAmount).toFixed(2));

    const result = await sql`
      UPDATE "Quote" SET
        "clientId"=${parsedClientId},
        "items"=${JSON.stringify(normalizedItems)}::jsonb,
        "amountSubtotal"=${amountSubtotal},
        "tpsAmount"=${tpsAmount},
        "tvqAmount"=${tvqAmount},
        "amountTotal"=${amountTotal},
        "validUntil"=${validUntilValue},
        "notes"=${notes?.trim() || null},
        "status"=${status}::"QuoteStatus",
        "updatedAt"=NOW()
      WHERE "id"=${quoteId} AND "userId"=${userId}
      RETURNING *
    `;

    return NextResponse.json(
      { message: "Soumission mise à jour avec succès.", quote: result[0] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ ERREUR API QUOTE PATCH :", error.message);
    return NextResponse.json(
      { error: error.message || "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const userId = (await cookies()).get("user_session")?.value;
    if (!userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id: quoteId } = await params;
    if (!quoteId) return NextResponse.json({ error: "Soumission invalide." }, { status: 400 });

    const sql = getDb();
    const rows = await sql`
      SELECT "id","quoteNumber","status" FROM "Quote"
      WHERE "id"=${quoteId} AND "userId"=${userId} LIMIT 1
    `;
    if (!rows.length) return NextResponse.json({ error: "Soumission introuvable." }, { status: 404 });

    const quote = rows[0];
    if (quote.status === "CONVERTED")
      return NextResponse.json(
        { error: "Une soumission déjà convertie en facture ne peut pas être supprimée." },
        { status: 409 }
      );

    await sql`
      DELETE FROM "Quote"
      WHERE "id"=${quoteId} AND "userId"=${userId}
    `;

    return NextResponse.json(
      { message: `Soumission ${quote.quoteNumber} supprimée avec succès.` },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ ERREUR API QUOTE DELETE :", error.message);
    return NextResponse.json(
      { error: error.message || "Une erreur interne est survenue lors de la suppression." },
      { status: 500 }
    );
  }
}