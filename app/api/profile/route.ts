import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError, text, safeLogo, emailAddress } from "@/lib/validation";

export async function GET() {
  try {
    const userId = await requireUser();
    const rows =
      await getDb()`SELECT id,email,"emailVerifiedAt","companyName","companyAddress","tpsNumber","tvqNumber","companyLogo","interacEmail","paymentTermsDays","invoicesIssued",plan,"subscriptionStatus" FROM "User" WHERE id=${userId}`;
    if (!rows[0]) throw new InputError("Session invalide.", 401);
    return NextResponse.json(rows[0]);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireUser();
    const body = await readJson(request, 2_850_000);
    const name = text(body.companyName, "Nom de l’entreprise", 200, true);
    const address = text(body.companyAddress, "Adresse", 500, true);
    const tps = text(body.tpsNumber, "Numéro de TPS", 30)
      .replace(/[\s-]/g, "")
      .toUpperCase();
    const tvq = text(body.tvqNumber, "Numéro de TVQ", 30)
      .replace(/[\s-]/g, "")
      .toUpperCase();
    if (tps && !/^\d{9}RT\d{4}$/.test(tps))
      throw new InputError("Format du numéro de TPS invalide.");
    if (tvq && !/^\d{10}TQ\d{4}$/.test(tvq))
      throw new InputError("Format du numéro de TVQ invalide.");
    const interacEmail = body.interacEmail ? emailAddress(body.interacEmail) : "";
    const rawTerms =
      body.paymentTermsDays === undefined || body.paymentTermsDays === ""
        ? 30
        : Number(body.paymentTermsDays);
    if (!Number.isInteger(rawTerms) || rawTerms < 0 || rawTerms > 365)
      throw new InputError(
        "Le délai de paiement doit être compris entre 0 et 365 jours.",
      );
    const logo = safeLogo(body.companyLogo);
    await getDb()`UPDATE "User" SET "companyName"=${name},"companyAddress"=${address},"tpsNumber"=${tps},"tvqNumber"=${tvq},"companyLogo"=${logo},"interacEmail"=${interacEmail},"paymentTermsDays"=${rawTerms} WHERE id=${userId}`;
    return NextResponse.json({ message: "Profil enregistré." });
  } catch (error) {
    return apiError(error);
  }
}
