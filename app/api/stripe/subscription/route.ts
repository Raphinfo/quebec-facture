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
    // ============================================================
    // 1. VÉRIFIER LA SESSION UTILISATEUR
    // ============================================================

    const cookieStore = await cookies();
    const userId = cookieStore.get("user_session")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    // ============================================================
    // 2. RÉCUPÉRER L'UTILISATEUR
    // ============================================================

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

    // ============================================================
    // 3. VALEURS STRIPE
    // ============================================================

    let trialEnd: string | null = null;
    let currentPeriodEnd: string | null = null;

    let cancelAtPeriodEnd = false;
    let cancelAt: string | null = null;

    // ============================================================
    // 4. RÉCUPÉRER L'ABONNEMENT STRIPE
    // ============================================================

    if (user.stripeSubId) {
      try {
        const stripe = getStripe();

        const subscription =
          await stripe.subscriptions.retrieve(
            user.stripeSubId
          );

        // ========================================================
        // FIN DE LA PÉRIODE D'ESSAI
        // ========================================================

        if (subscription.trial_end) {
          trialEnd = new Date(
            subscription.trial_end * 1000
          ).toISOString();
        }

        // ========================================================
        // ANNULATION PROGRAMMÉE
        // ========================================================

        cancelAtPeriodEnd =
          subscription.cancel_at_period_end === true ||
          subscription.cancel_at !== null;

        if (subscription.cancel_at) {
          cancelAt = new Date(
            subscription.cancel_at * 1000
          ).toISOString();
        }

        // ========================================================
        // FIN DE LA PÉRIODE COURANTE
        // Stripe v22 expose current_period_end sur l'item
        // ========================================================

        const firstItem =
          subscription.items.data[0];

        if (firstItem?.current_period_end) {
          currentPeriodEnd = new Date(
            firstItem.current_period_end * 1000
          ).toISOString();
        }

        // ========================================================
        // DEBUG TEMPORAIRE
        // ========================================================

        console.log(
          "ℹ️ Subscription Stripe :",
          {
            id: subscription.id,
            status: subscription.status,
            trial_end: subscription.trial_end,
            cancel_at_period_end:
              subscription.cancel_at_period_end,
            cancel_at:
              subscription.cancel_at,
          }
        );

      } catch (stripeError: any) {
        console.error(
          "❌ Impossible de récupérer l'abonnement Stripe :",
          stripeError.message
        );
      }
    }

    // ============================================================
    // 5. RETOUR API
    // ============================================================

    return NextResponse.json(
      {
        plan:
          user.plan === "PRO"
            ? "PRO"
            : "FREE",

        subscriptionStatus:
          user.subscriptionStatus || "ACTIVE",

        stripeCustomerId:
          user.stripeCustomerId || null,

        stripeSubId:
          user.stripeSubId || null,

        trialEnd,
        currentPeriodEnd,

        cancelAtPeriodEnd,
        cancelAt,
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