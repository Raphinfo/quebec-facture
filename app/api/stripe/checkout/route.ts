import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { getStripe, appOrigin } from "@/lib/stripe";
export async function POST(request: Request) {
  try {
    const userId = await requireUser(),
      body = await readJson(request, 4096),
      sql = getDb();
    await rateLimit(`checkout:${userId}`, 10, 3600);
    const trial = body.trial === true;
    const [user] = await sql`SELECT * FROM "User" WHERE id=${userId}`;
    if (user.stripeSubId)
      throw new InputError(
        "Gérez votre abonnement existant dans le portail de facturation.",
        409,
      );
    if (trial && user.trialUsed)
      throw new InputError("L’essai a déjà été utilisé pour ce compte.", 409);
    if (!process.env.STRIPE_PRICE_ID)
      throw new InputError(
        "Les abonnements ne sont pas encore configurés.",
        503,
      );
    if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_"))
      throw new InputError(
        "Application en mode portfolio/démonstration : paiements réels désactivés.",
        503,
      );
    const stripe = getStripe(),
      origin = appOrigin();
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
    if (
      !price.active ||
      price.currency !== "cad" ||
      price.unit_amount !== 1500 ||
      price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1
    )
      throw new InputError("Le forfait est momentanément indisponible.", 503);
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: user.email, metadata: { userId } },
        { idempotencyKey: `customer-${userId}` },
      );
      customerId = customer.id;
      await sql`UPDATE "User" SET "stripeCustomerId"=${customerId} WHERE id=${userId} AND "stripeCustomerId" IS NULL`;
    }
    // Évite un second abonnement si le webhook du premier paiement est encore en attente.
    const existing = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    if (
      existing.data.some(
        (subscription) =>
          !["canceled", "incomplete_expired"].includes(subscription.status),
      )
    ) {
      throw new InputError(
        "Un abonnement existe déjà chez Stripe. Utilisez le portail de facturation.",
        409,
      );
    }
    await sql`INSERT INTO "CheckoutAttempt" ("userId",id,trial,"expiresAt") VALUES (${userId},${crypto.randomUUID()},${trial},NOW()+INTERVAL '31 minutes')
      ON CONFLICT ("userId") DO UPDATE SET id=EXCLUDED.id,trial=EXCLUDED.trial,"expiresAt"=EXCLUDED."expiresAt" WHERE "CheckoutAttempt"."expiresAt"<NOW()`;
    const [attempt] =
      await sql`SELECT * FROM "CheckoutAttempt" WHERE "userId"=${userId}`;
    if (attempt.trial !== trial)
      throw new InputError(
        "Une autre offre est déjà en cours de paiement. Réessayez dans 31 minutes.",
        409,
      );
    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        client_reference_id: userId,
        metadata: { userId },
        subscription_data: {
          metadata: { userId },
          ...(trial ? { trial_period_days: 3 } : {}),
        },
        success_url: `${origin}/dashboard?tab=subscription&success=true`,
        cancel_url: `${origin}/choose-plan?canceled=true`,
        expires_at: Math.floor(new Date(attempt.expiresAt).getTime() / 1000),
      },
      { idempotencyKey: `checkout-${attempt.id}` },
    );
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiError(error);
  }
}
