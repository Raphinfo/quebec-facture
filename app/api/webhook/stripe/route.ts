import { subscriptionState } from "@/lib/subscriptions";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { apiError, readBodyText } from "@/lib/http";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET)
      return NextResponse.json(
        { error: "Service indisponible." },
        { status: 503 },
      );
    const signature=request.headers.get('stripe-signature');
    if(!signature)return NextResponse.json({error:'Signature manquante.'},{status:400});
    const body=await readBodyText(request,1_000_000);
    const stripe = getStripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      return NextResponse.json(
        { error: "Signature invalide." },
        { status: 400 },
      );
    }
    let subId: string | null = null;
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      subId =
        typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription?.id ?? null);
    } else if (
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ].includes(event.type)
    ) {
      subId = (event.data.object as Stripe.Subscription).id;
    } else if (
      [
        "invoice.paid",
        "invoice.payment_succeeded",
        "invoice.payment_failed",
      ].includes(event.type)
    ) {
      const invoice = event.data.object as Stripe.Invoice;
      const subscription = invoice.parent?.subscription_details?.subscription;
      subId =
        typeof subscription === "string"
          ? subscription
          : (subscription?.id ?? null);
    }
    if (!subId) return NextResponse.json({ received: true });
    // Relire l'état actuel : un événement ancien ne doit pas rétablir un ancien statut.
    const subscription = await stripe.subscriptions.retrieve(subId);
    const userId = subscription.metadata.userId;
    const customer =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    if (
      !userId ||
      !subscription.items.data.some(
        (item) => item.price.id === process.env.STRIPE_PRICE_ID,
      )
    )
      return NextResponse.json({ received: true });
    const { active, terminal, status, validUntil } =
      subscriptionState(subscription);
    const sql = getDb();
    const rows =
      await sql`UPDATE "User" SET plan=${active ? "PRO" : "FREE"},"subscriptionStatus"=${status}::"SubscriptionStatus",
      "stripeSubId"=${terminal ? null : subscription.id},"subscriptionValidUntil"=${validUntil},"trialUsed"=("trialUsed" OR ${Boolean(subscription.trial_start)})
      WHERE id=${userId} AND "stripeCustomerId"=${customer} AND ("stripeSubId"=${subscription.id} OR ("stripeSubId" IS NULL AND ${!terminal})) RETURNING id`;
    if (!rows.length && !terminal)
      return NextResponse.json(
        { error: "Rapprochement temporairement impossible." },
        { status: 500 },
      );
    return NextResponse.json({ received: true });
  } catch (error) {
    return apiError(error);
  }
}
