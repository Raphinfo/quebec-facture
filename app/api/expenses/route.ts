import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError, text } from "@/lib/validation";
export async function GET() {
  try {
    const id = await requireUser();
    return NextResponse.json(
      await getDb()`SELECT * FROM "Expense" WHERE "userId"=${id} ORDER BY "createdAt" DESC`,
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const id = await requireUser();
    const b = await readJson(request);
    const description = text(b.description, "Description", 1000, true),
      category = text(b.category ?? "Général", "Catégorie", 100, true);
    if (
      !["string", "number"].includes(typeof b.amount) ||
      !/^\d{1,8}(?:\.\d{1,2})?$/.test(String(b.amount)) ||
      Number(b.amount) <= 0
    )
      throw new InputError(
        "Montant positif requis, avec au plus deux décimales.",
      );
    await getDb()`INSERT INTO "Expense" (id,description,amount,category,"userId") VALUES (${crypto.randomUUID()},${description},${String(b.amount)},${category},${id})`;
    return NextResponse.json(
      { message: "Dépense enregistrée." },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
