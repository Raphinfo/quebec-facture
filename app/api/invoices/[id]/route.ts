import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError } from "@/lib/validation";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser(),
      { id } = await context.params;
    const b = await readJson(request);
    if (!["PENDING", "PAID", "CANCELED"].includes(String(b.status)))
      throw new InputError("Statut invalide.");
    const rows =
      await getDb()`UPDATE "Invoice" SET status=${String(b.status)}::"InvoiceStatus","updatedAt"=NOW()
      WHERE id=${id} AND "userId"=${userId} AND status<>'CANCELED' AND (status<>'PAID' OR ${String(b.status)}='PAID') RETURNING id`;
    if (!rows.length)
      throw new InputError(
        "Facture introuvable ou statut définitif. Une facture payée ou annulée ne peut plus être modifiée ici.",
        409,
      );
    return NextResponse.json({ message: "Statut enregistré." });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE() {
  try {
    await requireUser();
    throw new InputError(
      "Les factures émises sont conservées. Annulez une facture en attente plutôt que de la supprimer.",
      409,
    );
  } catch (error) {
    return apiError(error);
  }
}
