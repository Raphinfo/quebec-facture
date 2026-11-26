import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/http";
import { InputError } from "@/lib/validation";
export async function POST(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser(),
      { id } = await context.params;
    const rows =
      await getDb()`SELECT qf_issue_invoice(${userId},NULL,NULL,${id},NULL) AS result`;
    const result = rows[0].result;
    if (result.error) throw new InputError(result.error, result.status);
    return NextResponse.json(
      { ...result, message: "Soumission convertie." },
      { status: result.replayed ? 200 : 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
