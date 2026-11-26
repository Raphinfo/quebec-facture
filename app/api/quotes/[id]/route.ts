import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import {
  InputError,
  text,
  clientIdValue,
  validUntilValue,
} from "@/lib/validation";
import { calculateDocument } from "@/lib/money";
import { rateLimit } from "@/lib/rate-limit";
import { generateDocumentPdf } from "@/lib/pdf";
import { Resend } from "resend";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c]!,
  );

const money = (v: unknown) =>
  Number(v ?? 0).toLocaleString("fr-CA", {
    style: "currency",
    currency: "CAD",
  });

export async function POST(_: Request, { params }: Ctx) {
  try {
    const userId = await requireUser();
    if (!userId)
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    if (!process.env.RESEND_API_KEY)
      return NextResponse.json(
        { error: "Le service de courriel n’est pas encore configuré." },
        { status: 503 },
      );

    const { id } = await params;
    const sql = getDb();

    if (!process.env.RESEND_FROM_EMAIL)
      throw new InputError(
        "Le service de courriel n’est pas encore configuré.",
        503,
      );
    await rateLimit(`quote-email:${userId}`, 20, 3600);
    const [user] =
      await sql`SELECT email,"emailVerifiedAt" FROM "User" WHERE id=${userId}`;
    if (!user.emailVerifiedAt)
      throw new InputError(
        "Vérifiez votre adresse courriel dans votre espace avant d’envoyer des documents.",
        403,
      );
    // Figer les données avant l’appel externe. Un échec réseau conserve SENDING pour permettre une reprise idempotente.
    await sql`UPDATE "Quote" q SET status='SENDING',"updatedAt"=NOW(),
      "issuerSnapshot"=jsonb_build_object('companyName',u."companyName",'companyAddress',u."companyAddress",'tpsNumber',u."tpsNumber",'tvqNumber',u."tvqNumber",'companyLogo',u."companyLogo"),
      "clientSnapshot"=jsonb_build_object('name',c.name,'email',c.email,'company',c.company,'address',c.address)
      FROM "User" u,"Client" c WHERE q.id=${id} AND q."userId"=${userId} AND u.id=q."userId" AND c.id=q."clientId" AND c."userId"=q."userId" AND NULLIF(TRIM(u."companyName"),'') IS NOT NULL AND NULLIF(TRIM(u."companyAddress"),'') IS NOT NULL AND q.status='DRAFT' AND NULLIF(c.email,'') IS NOT NULL AND (q."validUntil" IS NULL OR q."validUntil">=(NOW() AT TIME ZONE 'America/Toronto')::date)`;
    const [q] =
      await sql`SELECT *,"clientSnapshot"->>'name' AS "clientName", "clientSnapshot"->>'company' AS "clientCompany", "clientSnapshot"->>'address' AS "clientAddress", "clientSnapshot"->>'email' AS "clientEmail", "issuerSnapshot"->>'companyName' AS "companyName", "issuerSnapshot"->>'companyAddress' AS "companyAddress", "issuerSnapshot"->>'tpsNumber' AS "tpsNumber", "issuerSnapshot"->>'tvqNumber' AS "tvqNumber", "issuerSnapshot"->>'companyLogo' AS "companyLogo" FROM "Quote" WHERE id=${id} AND "userId"=${userId}`;
    if (!q) throw new InputError("Soumission introuvable.", 404);
    if (q.status === "SENT")
      return NextResponse.json({
        message: "Soumission déjà envoyée.",
        status: "SENT",
      });
    if (q.status !== "SENDING")
      throw new InputError(
        "Un brouillon non expiré, une adresse courriel de client et un profil d’entreprise complet sont requis.",
        409,
      );
    // Resend conserve les clés 24 heures ; passé ce délai, une réconciliation manuelle évite un doublon.
    if (Date.now() - new Date(q.updatedAt).getTime() > 23 * 3600000)
      throw new InputError(
        "Cet envoi doit être vérifié par le support avant une nouvelle tentative.",
        409,
      );
    const items = Array.isArray(q.items) ? q.items : [];
    const lines = items
      .map(
        (i: {
          description: string;
          quantity: number;
          unitPrice: number;
          amount?: number;
        }) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #ddd">${esc(i.description)}</td>
        <td style="padding:8px;text-align:center;border-bottom:1px solid #ddd">${Number(i.quantity)}</td>
        <td style="padding:8px;text-align:right;border-bottom:1px solid #ddd">${money(i.unitPrice)}</td>
        <td style="padding:8px;text-align:right;border-bottom:1px solid #ddd">${money(i.amount ?? Number(i.quantity) * Number(i.unitPrice))}</td>
      </tr>`,
      )
      .join("");

    const valid = q.validUntil
      ? new Date(q.validUntil).toLocaleDateString("fr-CA", { timeZone: "UTC" })
      : "Aucune";

    const company = q.companyName || "Québec Facture";
    const pdfBytes = await generateDocumentPdf({
      kind: "Soumission",
      number: q.quoteNumber,
      date: new Date(q.createdAt).toLocaleDateString("fr-CA"),
      dueDate: q.validUntil ? valid : undefined,
      companyName: company,
      companyAddress: q.companyAddress || undefined,
      tpsNumber: q.tpsNumber || undefined,
      tvqNumber: q.tvqNumber || undefined,
      companyLogo: q.companyLogo || undefined,
      clientName: q.clientName,
      clientCompany: q.clientCompany || undefined,
      clientAddress: q.clientAddress || undefined,
      clientEmail: q.clientEmail || undefined,
      items,
      subtotal: Number(q.amountSubtotal),
      tps: Number(q.tpsAmount),
      tvq: Number(q.tvqAmount),
      total: Number(q.amountTotal),
      notes: q.notes || undefined,
    });
    const safeFilename = String(q.quoteNumber).replace(/[^A-Za-z0-9_-]/g, "_");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send(
      {
        from: process.env.RESEND_FROM_EMAIL!,
        to: [q.clientEmail],
        replyTo: user.email,
        subject: `Soumission ${q.quoteNumber} — ${company}`,
        attachments: [
          {
            filename: `${safeFilename}.pdf`,
            content: Buffer.from(pdfBytes),
          },
        ],
        html: `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;color:#222">
          <h2>${esc(company)}</h2>
          <p>Bonjour ${esc(q.clientName)},</p>
          <p>Voici votre soumission <strong>${esc(q.quoteNumber)}</strong>.</p>
          <p>Valide jusqu’au : <strong>${valid}</strong></p>

          <table style="width:100%;border-collapse:collapse;margin:24px 0">
            <thead>
              <tr>
                <th style="padding:8px;text-align:left;border-bottom:2px solid #222">Description</th>
                <th style="padding:8px;border-bottom:2px solid #222">Qté</th>
                <th style="padding:8px;text-align:right;border-bottom:2px solid #222">Prix</th>
                <th style="padding:8px;text-align:right;border-bottom:2px solid #222">Total</th>
              </tr>
            </thead>
            <tbody>${lines}</tbody>
          </table>

          <div style="text-align:right">
            <p>Sous-total : ${money(q.amountSubtotal)}</p>
            <p>TPS : ${money(q.tpsAmount)}</p>
            <p>TVQ : ${money(q.tvqAmount)}</p>
            <h3>Total : ${money(q.amountTotal)}</h3>
          </div>

          ${q.notes ? `<p><strong>Notes :</strong><br>${esc(q.notes)}</p>` : ""}
          <p>Merci,<br>${esc(company)}</p>
        </div>
      `,
      },
      { idempotencyKey: `quote-${id}-v${q.version}` },
    );

    if (error) {
      console.error("Échec fournisseur de courriel.");
      return NextResponse.json(
        {
          error:
            "Envoi non confirmé. Vous pouvez reprendre l’envoi sans modifier la soumission.",
        },
        { status: 502 },
      );
    }

    await sql`UPDATE "Quote" SET status='SENT',"emailId"=${data?.id || null},"updatedAt"=NOW(),version=version+1
      WHERE id=${id} AND "userId"=${userId} AND status='SENDING'`;

    return NextResponse.json({
      message: `Soumission envoyée à ${q.clientEmail}.`,
      emailId: data?.id,
      status: "SENT",
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const userId = await requireUser(),
      { id } = await context.params,
      b = await readJson(request),
      sql = getDb();
    const [quote] =
      await sql`SELECT * FROM "Quote" WHERE id=${id} AND "userId"=${userId}`;
    if (!quote) throw new InputError("Soumission introuvable.", 404);
    const transitions: Record<string, string[]> = {
      DRAFT: ["DRAFT"],
      SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
      ACCEPTED: [],
      REJECTED: [],
      EXPIRED: [],
      CONVERTED: [],
    };
    const status = String(b.status ?? quote.status);
    if (!transitions[quote.status]?.includes(status))
      throw new InputError(
        "Transition invalide. Utilisez le bouton Envoyer pour transmettre un brouillon.",
        409,
      );
    if (Number(b.version) !== quote.version)
      throw new InputError(
        "Cette soumission a changé. Rechargez-la avant de réessayer.",
        409,
      );
    let result;
    if (quote.status === "DRAFT") {
      const clientId = clientIdValue(b.clientId),
        validUntil = validUntilValue(b.validUntil),
        notes = text(b.notes, "Notes", 5000);
      const [user] =
        await sql`SELECT "tpsNumber","tvqNumber" FROM "User" WHERE id=${userId}`;
      const doc = calculateDocument(b.items, {
        tps: Boolean(user.tpsNumber),
        tvq: Boolean(user.tvqNumber),
      });
      result =
        await sql`UPDATE "Quote" SET "clientId"=${clientId},"validUntil"=${validUntil}::date,notes=${notes},items=${JSON.stringify(doc.items)}::jsonb,
        "amountSubtotal"=${doc.amountSubtotal},"tpsAmount"=${doc.tpsAmount},"tvqAmount"=${doc.tvqAmount},"amountTotal"=${doc.amountTotal},version=version+1,"updatedAt"=NOW()
        WHERE id=${id} AND "userId"=${userId} AND version=${quote.version} AND status='DRAFT' AND EXISTS(SELECT 1 FROM "Client" WHERE id=${clientId} AND "userId"=${userId}) RETURNING *`;
    } else {
      result =
        await sql`UPDATE "Quote" SET status=${status}::"QuoteStatus",version=version+1,"updatedAt"=NOW() WHERE id=${id} AND "userId"=${userId} AND version=${quote.version} RETURNING *`;
    }
    if (!result.length)
      throw new InputError(
        "Modification concurrente ou client invalide. Rechargez la page.",
        409,
      );
    return NextResponse.json({
      quote: result[0],
      message: "Soumission mise à jour.",
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(_: Request, context: Ctx) {
  try {
    const userId = await requireUser(),
      { id } = await context.params;
    const result =
      await getDb()`DELETE FROM "Quote" WHERE id=${id} AND "userId"=${userId} AND status='DRAFT' RETURNING id`;
    if (!result.length)
      throw new InputError("Seuls les brouillons peuvent être supprimés.", 409);
    return NextResponse.json({ message: "Brouillon supprimé." });
  } catch (error) {
    return apiError(error);
  }
}
