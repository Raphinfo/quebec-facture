import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashToken } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    const b = await readJson(request, 4096);
    if (typeof b.token !== "string" || !/^[a-f0-9]{64}$/.test(b.token))
      throw new InputError("Lien invalide.");
    const rows =
      await getDb()`WITH token AS (DELETE FROM "VerificationToken" WHERE "tokenHash"=${hashToken(b.token)} AND "expiresAt">NOW() RETURNING "userId") UPDATE "User" SET "emailVerifiedAt"=NOW() WHERE id IN (SELECT "userId" FROM token) RETURNING id`;
    if (!rows.length)
      throw new InputError("Ce lien a expiré ou a déjà été utilisé.");
    return NextResponse.json({
      message: "Votre adresse courriel est confirmée.",
    });
  } catch (error) {
    return apiError(error);
  }
}
