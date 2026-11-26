import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { requireUser, SESSION_COOKIE } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError, passwordValue } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const userId = await requireUser();
    await rateLimit(`close-account:${userId}`, 5, 3600);
    const body = await readJson(request, 4096);
    const password = passwordValue(body.password);
    if (body.confirm !== true) {
      throw new InputError("Veuillez confirmer la fermeture définitive de votre compte.");
    }

    const sql = getDb();
    const [user] =
      await sql`SELECT id,password,"stripeSubId" FROM "User" WHERE id=${userId}`;
    if (!user) throw new InputError("Session invalide.", 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new InputError("Mot de passe incorrect.", 401);

    if (user.stripeSubId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = getStripe();
        const sub = await stripe.subscriptions.retrieve(user.stripeSubId);
        if (!["canceled", "incomplete_expired"].includes(sub.status)) {
          await stripe.subscriptions.cancel(user.stripeSubId);
        }
      } catch (err) {
        const code =
          typeof err === "object" && err !== null && "code" in err
            ? String((err as { code?: unknown }).code)
            : "";
        if (code !== "resource_missing") {
          throw new InputError(
            "Impossible d’annuler votre abonnement Stripe automatiquement. Annulez-le d’abord dans le portail Stripe.",
            502,
          );
        }
      }
    }

    await sql`DELETE FROM "User" WHERE id=${userId}`;
    const response = NextResponse.json({
      message: "Votre compte et vos données ont été supprimés.",
    });
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete("user_session");
    return response;
  } catch (error) {
    return apiError(error);
  }
}
