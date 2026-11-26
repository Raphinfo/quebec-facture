import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/http";
import { InputError, escapeHtml } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { generateDocumentPdf } from "@/lib/pdf";
import { issuerSignatureHtml } from "@/lib/email-signature";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const money = (v: unknown) =>
  Number(v ?? 0).toLocaleString("fr-CA", {
    style: "currency",
    currency: "CAD",
  });

export async function POST(_: Request, { params }: Ctx) {
  try {
    const userId = await requireUser();
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json(
        { error: "Le service de courriel n’est pas encore configuré." },
        { status: 503 },
      );
    }

    const { id } = await params;
    const sql = getDb();
    await rateLimit(`invoice-email:${userId}`, 25, 3600);

    const [user] =
      await sql`SELECT email,"emailVerifiedAt","interacEmail" FROM "User" WHERE id=${userId}`;
    if (!user?.emailVerifiedAt) {
      throw new InputError(
        "Vérifiez votre adresse courriel dans votre espace avant d’envoyer des factures.",
        403,
      );
    }

    const [inv] = await sql`
      SELECT i.id, i.number AS "invoiceNumber", i.status, i."dueDate", i."createdAt",
        COALESCE(i."amountSubtotal", i."sousTotal") AS "amountSubtotal",
        COALESCE(i."tpsAmount", i."totalTPS") AS "tpsAmount",
        COALESCE(i."tvqAmount", i."totalTVQ") AS "tvqAmount",
        COALESCE(i."amountTotal", i."totalGlobal") AS "amountTotal",
        COALESCE(i.items::jsonb, i."itemsJson"::jsonb) AS items,
        COALESCE(i."clientSnapshot"->>'name', i."clientName") AS "clientName",
        COALESCE(i."clientSnapshot"->>'company', i."clientCompany") AS "clientCompany",
        COALESCE(NULLIF(i."clientSnapshot"->>'address',''), NULLIF(i."clientAddress",''), NULLIF(c.address,'')) AS "clientAddress",
        COALESCE(NULLIF(i."clientSnapshot"->>'email',''), NULLIF(i."clientEmail",''), NULLIF(c.email,'')) AS "clientEmail",
        i."issuerSnapshot"->>'companyName' AS "companyName",
        i."issuerSnapshot"->>'companyAddress' AS "companyAddress",
        i."issuerSnapshot"->>'tpsNumber' AS "tpsNumber",
        i."issuerSnapshot"->>'tvqNumber' AS "tvqNumber",
        i."issuerSnapshot"->>'companyLogo' AS "companyLogo",
        COALESCE(NULLIF(i."issuerSnapshot"->>'interacEmail',''), NULLIF(${user.interacEmail || ""},'')) AS "interacEmail"
      FROM "Invoice" i
      LEFT JOIN "Client" c ON c.id = i."clientId" AND c."userId" = i."userId"
      WHERE i.id=${id} AND i."userId"=${userId}
    `;

    if (!inv) throw new InputError("Facture introuvable.", 404);
    if (inv.status === "CANCELED") {
      throw new InputError("Une facture annulée ne peut pas être envoyée.", 409);
    }
    if (!inv.clientEmail) {
      throw new InputError(
        "Ajoutez une adresse courriel à ce client avant d’envoyer la facture.",
        400,
      );
    }

    const items = Array.isArray(inv.items) ? inv.items : [];
    const issuedDate = new Date(inv.createdAt).toLocaleDateString("fr-CA");
    const dueLabel = inv.dueDate
      ? new Date(inv.dueDate).toLocaleDateString("fr-CA", { timeZone: "UTC" })
      : undefined;
    const company = inv.companyName || "Québec Facture";

    const pdfBytes = await generateDocumentPdf({
      kind: "Facture",
      number: inv.invoiceNumber,
      date: issuedDate,
      dueDate: dueLabel,
      status: inv.status,
      companyName: company,
      companyAddress: inv.companyAddress || undefined,
      tpsNumber: inv.tpsNumber || undefined,
      tvqNumber: inv.tvqNumber || undefined,
      companyLogo: inv.companyLogo || undefined,
      interacEmail: inv.interacEmail || undefined,
      clientName: inv.clientName,
      clientCompany: inv.clientCompany || undefined,
      clientAddress: inv.clientAddress || undefined,
      clientEmail: inv.clientEmail,
      items,
      subtotal: Number(inv.amountSubtotal),
      tps: Number(inv.tpsAmount),
      tvq: Number(inv.tvqAmount),
      total: Number(inv.amountTotal),
    });

    const lines = items
      .map(
        (i: {
          description: string;
          quantity?: number;
          unitPrice?: number;
          amount?: number;
          total?: number;
        }) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb">${escapeHtml(i.description)}</td>
        <td style="padding:10px 8px;text-align:center;border-bottom:1px solid #e5e7eb">${Number(i.quantity ?? 1)}</td>
        <td style="padding:10px 8px;text-align:right;border-bottom:1px solid #e5e7eb">${money(i.amount ?? i.total ?? Number(i.quantity ?? 1) * Number(i.unitPrice ?? 0))}</td>
      </tr>`,
      )
      .join("");

    const resend = new Resend(process.env.RESEND_API_KEY);
    const minuteBucket = Math.floor(Date.now() / 60000);
    const safeFilename = String(inv.invoiceNumber).replace(/[^A-Za-z0-9_-]/g, "_");

    const { data, error } = await resend.emails.send(
      {
        from: process.env.RESEND_FROM_EMAIL,
        to: [inv.clientEmail],
        replyTo: user.email,
        subject: `Facture ${inv.invoiceNumber} — ${company}`,
        attachments: [
          {
            filename: `${safeFilename}.pdf`,
            content: Buffer.from(pdfBytes),
          },
        ],
        html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:680px;margin:auto;color:#111827;line-height:1.6">
          <div style="border-bottom:2px solid #1d4ed8;padding-bottom:16px;margin-bottom:24px">
            <h2 style="margin:0;color:#111827">${escapeHtml(company)}</h2>
            ${inv.companyAddress ? `<p style="margin:4px 0 0;color:#4b5563;font-size:13px">${escapeHtml(inv.companyAddress)}</p>` : ""}
          </div>
          <p>Bonjour ${escapeHtml(inv.clientName)},</p>
          <p>Veuillez trouver ci-joint en format <strong>PDF</strong> votre facture <strong>${escapeHtml(inv.invoiceNumber)}</strong> émise le ${issuedDate}${dueLabel ? ` (échéance : <strong>${dueLabel}</strong>)` : ""}, ainsi que son récapitulatif ci-dessous :</p>

          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e5e7eb">Description</th>
                <th style="padding:10px 8px;text-align:center;border-bottom:2px solid #e5e7eb">Qté</th>
                <th style="padding:10px 8px;text-align:right;border-bottom:2px solid #e5e7eb">Montant</th>
              </tr>
            </thead>
            <tbody>${lines}</tbody>
          </table>

          <div style="text-align:right;margin-bottom:20px">
            <p style="margin:4px 0;color:#4b5563">Sous-total : ${money(inv.amountSubtotal)}</p>
            <p style="margin:4px 0;color:#4b5563">TPS : ${money(inv.tpsAmount)}</p>
            <p style="margin:4px 0;color:#4b5563">TVQ : ${money(inv.tvqAmount)}</p>
            <h3 style="margin:10px 0 0;color:#1d4ed8">Total CAD : ${money(inv.amountTotal)}</h3>
          </div>

          ${
            inv.status === "PAID"
              ? `<div style="padding:12px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;color:#065f46;font-size:13px"><strong>Statut : Payée</strong> — Merci pour votre règlement.</div>`
              : inv.interacEmail
                ? `<div style="padding:14px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:13px;color:#1e3a8a">
                    <strong>Instructions de paiement — Virement Interac</strong><br>
                    Envoyez votre virement à : <strong>${escapeHtml(inv.interacEmail)}</strong><br>
                    Indiquez le numéro <strong>${escapeHtml(inv.invoiceNumber)}</strong> dans le message du virement.
                  </div>`
                : ""
          }

          ${issuerSignatureHtml({
            companyName: company,
            companyAddress: inv.companyAddress,
            replyToEmail: user.email,
          })}
        </div>
      `,
      },
      { idempotencyKey: `invoice-${id}-${minuteBucket}` },
    );

    if (error) {
      return NextResponse.json(
        { error: "L’envoi du courriel a échoué. Veuillez réessayer." },
        { status: 502 },
      );
    }

    const [updated] =
      await sql`UPDATE "Invoice" SET "sentAt"=NOW(),"emailId"=${data?.id || null},"updatedAt"=NOW() WHERE id=${id} AND "userId"=${userId} RETURNING "sentAt"`;

    return NextResponse.json({
      message: `Facture PDF envoyée à ${inv.clientEmail}.`,
      emailId: data?.id,
      sentAt: updated?.sentAt,
    });
  } catch (error) {
    return apiError(error);
  }
}
