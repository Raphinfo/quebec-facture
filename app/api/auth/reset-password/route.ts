import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashToken } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError, passwordValue } from "@/lib/validation";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const b = await readJson(request, 4096);
    if (typeof b.token !== "string" || !/^[a-f0-9]{64}$/.test(b.token))
      throw new InputError("Lien invalide ou expiré.");
    const password = passwordValue(b.password, true),
      hash = await bcrypt.hash(password, 12),
      sql = getDb();
    const rows =
      await sql`WITH token AS (DELETE FROM "PasswordReset" WHERE "tokenHash"=${hashToken(b.token)} AND "expiresAt">NOW() RETURNING "userId"),
      updated AS (UPDATE "User" SET password=${hash} WHERE id IN (SELECT "userId" FROM token) RETURNING id),
      revoked AS (DELETE FROM "Session" WHERE "userId" IN (SELECT id FROM updated)) SELECT id FROM updated`;
    if (!rows.length) throw new InputError("Lien invalide ou expiré.");
    return NextResponse.json({
      message: "Mot de passe modifié. Reconnectez-vous sur vos appareils.",
    });
  } catch (error) {
    return apiError(error);
  }
}
