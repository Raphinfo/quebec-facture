import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError, text, emailAddress, escapeHtml } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
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
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.SUPPORT_EMAIL,
      replyTo: email,
      subject: "Demande de support Québec Facture",
      html: `<p>${escapeHtml(name)}</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
    });
    if (error)
      throw new InputError(
        "Le message n’a pas pu être envoyé. Veuillez réessayer.",
        502,
      );
    return NextResponse.json({ message: "Message envoyé." });
  } catch (error) {
    return apiError(error);
  }
}
