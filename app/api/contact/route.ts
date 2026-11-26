import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError, text, emailAddress, escapeHtml } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { brandSignatureHtml, buildBrandEmailHtml } from "@/lib/email-signature";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const userId = await requireUser();
    await rateLimit(`support:${userId}`, 5, 3600);
    const b = await readJson(request, 16000),
      name = text(b.name, "Nom", 150, true),
      email = emailAddress(b.email),
      message = text(b.message, "Message", 5000, true);
    if (
      !process.env.RESEND_API_KEY ||
      !process.env.RESEND_FROM_EMAIL ||
      !process.env.SUPPORT_EMAIL
    )
      throw new InputError(
        "Le formulaire est momentanément indisponible. Utilisez le lien de courriel du support.",
        503,
      );

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.SUPPORT_EMAIL,
      replyTo: email,
      subject: `Support Québec Facture — ${name}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:620px;color:#0f172a;line-height:1.6">
          <h3 style="margin:0 0 12px">Nouvelle demande de support</h3>
          <p style="margin:0 0 14px;font-size:13px;color:#475569">
            <strong>Nom :</strong> ${escapeHtml(name)}<br>
            <strong>Courriel de réponse :</strong> ${escapeHtml(email)}
          </p>
          <div style="padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:14px">
            ${escapeHtml(message).replace(/\n/g, "<br>")}
          </div>
          ${brandSignatureHtml()}
        </div>
      `,
    });
    if (error)
      throw new InputError(
        "Le message n’a pas pu être envoyé. Veuillez réessayer.",
        502,
      );

    // Accusé de réception automatique envoyé uniquement au courriel du compte authentifié.
    try {
      const [account] =
        await getDb()`SELECT email FROM "User" WHERE id=${userId}`;
      if (account?.email) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: account.email,
          replyTo: process.env.SUPPORT_EMAIL,
          subject: "Confirmation de réception — Support Québec Facture",
          html: buildBrandEmailHtml({
            eyebrow: "SUPPORT QUÉBEC FACTURE",
            title: "Nous avons bien reçu votre message.",
            bodyHtml: `<p>Bonjour ${escapeHtml(name)},</p>
              <p>Merci d’avoir contacté Québec Facture. Votre demande a bien été transmise à notre équipe de support qui vous répondra dans les meilleurs délais.</p>`,
          }),
        });
      }
    } catch {
      /* Ne pas bloquer la réponse si l'accusé de réception échoue. */
    }

    return NextResponse.json({ message: "Message envoyé." });
  } catch (error) {
    return apiError(error);
  }
}
