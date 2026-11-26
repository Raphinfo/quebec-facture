import { createHash } from "node:crypto";
import { getDb } from "./db";
import { InputError } from "./validation";
// Compteur partagé entre instances. Les identifiants sont hachés.
export async function rateLimit(key: string, limit = 10, seconds = 900) {
  const hash = createHash("sha256").update(key).digest("hex");
  const sql = getDb();
  const rows = await sql`
    INSERT INTO "RateLimit" (key, count, "expiresAt") VALUES (${hash},1,NOW()+${seconds}*INTERVAL '1 second')
    ON CONFLICT (key) DO UPDATE SET
      count=CASE WHEN "RateLimit"."expiresAt"<=NOW() THEN 1 ELSE "RateLimit".count+1 END,
      "expiresAt"=CASE WHEN "RateLimit"."expiresAt"<=NOW() THEN NOW()+${seconds}*INTERVAL '1 second' ELSE "RateLimit"."expiresAt" END
    RETURNING count`;
  if (Number(rows[0].count) > limit)
    throw new InputError(
      "Trop de tentatives. Réessayez dans quelques minutes.",
      429,
    );
}
