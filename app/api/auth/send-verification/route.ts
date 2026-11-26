import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import { requireUser, hashToken } from "@/lib/session";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/http";
import { InputError, escapeHtml } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { appOrigin } from "@/lib/stripe";
export async function POST() {
  try {
    const userId = await requireUser();
    await rateLimit(`verify:${userId}`, 3, 3600);
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
      throw new InputError(
        "Le service de courriel n’est pas encore configuré.",
        503,
      );
    const sql = getDb(),
      [user] =
        await sql`SELECT email,"emailVerifiedAt" FROM "User" WHERE id=${userId}`;
    if (user.emailVerifiedAt)
      return NextResponse.json({ message: "Votre adresse est déjà vérifiée." });
    const token = randomBytes(32).toString("hex");
    await sql.transaction([
      sql`DELETE FROM "VerificationToken" WHERE "userId"=${userId}`,
      sql`INSERT INTO "VerificationToken" ("tokenHash","userId","expiresAt") VALUES (${hashToken(token)},${userId},NOW()+INTERVAL '1 hour')`,
    ]);
    const url = `${appOrigin()}/verify-email?token=${token}`;
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: user.email,
      subject: "Confirmez votre adresse courriel",
      html: `<p>Confirmez votre adresse pour envoyer vos soumissions.</p><p><a href="${escapeHtml(url)}">Confirmer mon adresse</a></p><p>Ce lien expire dans une heure.</p>`,
    });
    if (error)
      throw new InputError(
        "Le courriel n’a pas pu être envoyé. Réessayez plus tard.",
        502,
      );
    return NextResponse.json({
      message: "Un lien de confirmation a été envoyé à votre adresse.",
    });
  } catch (error) {
    return apiError(error);
  }
}
