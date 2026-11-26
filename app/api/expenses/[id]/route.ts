import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/http";
import { InputError } from "@/lib/validation";
export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser(),
      { id } = await context.params;
    const rows =
      await getDb()`DELETE FROM "Expense" WHERE id=${id} AND "userId"=${userId} RETURNING id`;
    if (!rows.length) throw new InputError("Dépense introuvable.", 404);
    return NextResponse.json({ message: "Dépense supprimée." });
  } catch (error) {
    return apiError(error);
  }
}
