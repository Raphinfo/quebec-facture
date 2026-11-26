import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashToken } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError, emailAddress } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { appOrigin } from "@/lib/stripe";
import { buildBrandEmailHtml } from "@/lib/email-signature";
import { Resend } from "resend";
import { randomBytes } from "node:crypto";
export async function POST(request: Request) {
  try {
    const b = await readJson(request, 4096),
      email = emailAddress(b.email);
    await rateLimit(`reset:${email}`, 3, 3600);
    await rateLimit("reset:global", 100, 3600);
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
      throw new InputError(
        "La récupération de compte n’est pas encore configurée.",
        503,
      );
    const sql = getDb(),
      [user] =
        await sql`SELECT id FROM "User" WHERE LOWER(TRIM(email))=${email}`;
    if (user) {
      const token = randomBytes(32).toString("hex");
      await sql.transaction([
        sql`DELETE FROM "PasswordReset" WHERE "userId"=${user.id}`,
        sql`INSERT INTO "PasswordReset" ("tokenHash","userId","expiresAt") VALUES (${hashToken(token)},${user.id},NOW()+INTERVAL '30 minutes')`,
      ]);
      const url = `${appOrigin()}/reset-password?token=${token}`;
      const { error } = await new Resend(
        process.env.RESEND_API_KEY,
      ).emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: email,
        subject: "Réinitialiser votre mot de passe",
        html: buildBrandEmailHtml({
          eyebrow: "SÉCURITÉ DU COMPTE",
          title: "Réinitialisation de votre mot de passe",
          bodyHtml: `<p>Vous avez demandé à réinitialiser votre mot de passe Québec Facture.</p>
            <p>Ce lien est valable <strong>30 minutes</strong> et utilisable une seule fois.</p>
            <p style="font-size:13px;color:#475569">Si vous n’êtes pas à l’origine de cette demande, ignorez simplement ce message.</p>`,
          ctaLabel: "Choisir un nouveau mot de passe →",
          ctaUrl: url,
        }),
      });
      if (error) console.error("Échec d’envoi du courriel de récupération.");
    }
    return NextResponse.json({
      message:
        "Si un compte correspond à ce courriel, un lien de récupération vous sera envoyé.",
    });
  } catch (error) {
    return apiError(error);
  }
}
