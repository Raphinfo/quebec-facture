import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "./db";
import { InputError } from "./validation";
export const SESSION_COOKIE = "qf_session";
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const sql = getDb();
  const rows =
    await sql`SELECT "userId" FROM "Session" WHERE "tokenHash"=${hashToken(token)} AND "expiresAt">NOW()`;
  return rows[0]?.userId ?? null;
}
export async function requireUser(): Promise<string> {
  const id = await getSessionUserId();
  if (!id)
    throw new InputError("Session expirée. Veuillez vous reconnecter.", 401);
  return id;
}
export async function createSession(userId: string, response: NextResponse) {
  const token = randomBytes(32).toString("hex");
  const sql = getDb();
  const oldToken = (await cookies()).get(SESSION_COOKIE)?.value;
  await sql.transaction([
    sql`DELETE FROM "Session" WHERE "tokenHash"=${hashToken(oldToken ?? "")} OR ("userId"=${userId} AND "expiresAt"<=NOW())`,
    sql`INSERT INTO "Session" ("tokenHash","userId","expiresAt") VALUES (${hashToken(token)},${userId},NOW()+INTERVAL '7 days')`,
  ]);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 604800,
  });
  response.cookies.delete("user_session");
}
export async function revokeSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token)
    await getDb()`DELETE FROM "Session" WHERE "tokenHash"=${hashToken(token)}`;
}
