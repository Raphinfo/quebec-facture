import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { subscriptionState } from "@/lib/subscriptions";
import { apiError } from "@/lib/http";
import { InputError } from "@/lib/validation";
export async function GET() {
  try {
    const userId = await requireUser(),
      sql = getDb();
    const [user] =
      await sql`SELECT plan,"subscriptionStatus","stripeCustomerId","stripeSubId" FROM "User" WHERE id=${userId}`;
    if (!user) throw new InputError("Session invalide.", 401);
    let trialEnd: string | null = null,
      currentPeriodEnd: string | null = null,
      cancelAt: string | null = null,
      cancelAtPeriodEnd = false;
    if (user.stripeSubId) {
      const subscription = await getStripe().subscriptions.retrieve(
        user.stripeSubId,
      );
      const customer =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      if (
        customer !== user.stripeCustomerId ||
        subscription.metadata.userId !== userId ||
        !subscription.items.data.some(
          (item) => item.price.id === process.env.STRIPE_PRICE_ID,
        )
      )
        throw new InputError(
          "L’abonnement doit être vérifié par le support.",
          409,
        );
      const state = subscriptionState(subscription);
      await sql`UPDATE "User" SET plan=${state.active ? "PRO" : "FREE"},"subscriptionStatus"=${state.status}::"SubscriptionStatus","subscriptionValidUntil"=${state.validUntil},"stripeSubId"=${state.terminal ? null : subscription.id} WHERE id=${userId} AND "stripeSubId"=${subscription.id}`;
      user.plan = state.active ? "PRO" : "FREE";
      user.subscriptionStatus = state.status;
      trialEnd = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null;
      const end = subscription.items.data[0]?.current_period_end;
      currentPeriodEnd = end ? new Date(end * 1000).toISOString() : null;
      cancelAtPeriodEnd =
        subscription.cancel_at_period_end || Boolean(subscription.cancel_at);
      cancelAt = subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null;
    }
    return NextResponse.json({
      ...user,
      trialEnd,
      currentPeriodEnd,
      cancelAt,
      cancelAtPeriodEnd,
    });
  } catch (error) {
    return apiError(error);
  }
}
