import { NextResponse } from "next/server";
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function getDb() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error("DATABASE_URL est manquante.");
  }

  return neon(dbUrl);
}

function getStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    throw new Error("STRIPE_SECRET_KEY est manquante.");
  }

  return new Stripe(stripeKey);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_session")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const sql = getDb();

    const users = await sql`
      SELECT
        id,
        email,
        plan,
        "subscriptionStatus",
        "stripeCustomerId",
        "stripeSubId"
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `;

    const user = users[0];

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    let trialEnd: string | null = null;
    let currentPeriodEnd: string | null = null;

    if (user.stripeSubId) {
      try {
        const stripe = getStripe();

        const subscription =
          await stripe.subscriptions.retrieve(user.stripeSubId);

        if (subscription.trial_end) {
          trialEnd = new Date(
            subscription.trial_end * 1000
          ).toISOString();
        }

       const firstItem = subscription.items.data[0];

        if (firstItem?.current_period_end) {
        currentPeriodEnd = new Date(
            firstItem.current_period_end * 1000
        ).toISOString();
        }

      } catch (stripeError: any) {
        console.error(
          "❌ Impossible de récupérer l'abonnement Stripe :",
          stripeError.message
        );
      }
    }

    return NextResponse.json(
      {
        plan: user.plan || "FREE",
        subscriptionStatus:
          user.subscriptionStatus || "ACTIVE",

        stripeCustomerId:
          user.stripeCustomerId || null,

        stripeSubId:
          user.stripeSubId || null,

        trialEnd,
        currentPeriodEnd,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error(
      "❌ Erreur récupération abonnement :",
      error.message
    );

    return NextResponse.json(
      {
        error:
          "Erreur lors de la récupération de l'abonnement.",
      },
      { status: 500 }
    );
  }
}