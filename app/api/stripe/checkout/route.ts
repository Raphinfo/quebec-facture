import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
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
    // 2. LIRE LE CHOIX : ESSAI OU PRO IMMÉDIAT
    // ============================================================
    let body: { trial?: boolean };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Requête invalide." },
        { status: 400 }
      );
    }

    const trial = body.trial === true;

    console.log(
      trial
        ? "🎁 Checkout demandé avec essai gratuit de 3 jours."
        : "💳 Checkout PRO demandé sans essai."
    );

    // ============================================================
    // 3. VÉRIFIER LE PRICE ID
    // ============================================================
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      throw new Error("STRIPE_PRICE_ID est manquante.");
    }

    const sql = getDb();
    const stripe = getStripe();

    // ============================================================
    // 4. RÉCUPÉRER L'UTILISATEUR
    // ============================================================
    const users = await sql`
      SELECT
        email,
        "stripeCustomerId",
        plan,
        "subscriptionStatus",
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
    // 5. ÉVITER DE CRÉER PLUSIEURS ABONNEMENTS PRO
    // ============================================================
    if (
      user.stripeSubId &&
      (
        user.subscriptionStatus === "ACTIVE" ||
        user.subscriptionStatus === "TRIALING"
      ) &&
      user.plan === "PRO"
    ) {
      return NextResponse.json(
        {
          error:
            "Vous avez déjà un abonnement Professionnel actif ou en période d'essai.",
        },
        { status: 409 }
      );
    }

    // ============================================================
    // 6. CONFIGURATION STRIPE CHECKOUT
    // ============================================================
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      mode: "subscription",

      success_url:
        `${req.nextUrl.origin}/dashboard?success=true`,

      cancel_url:
        `${req.nextUrl.origin}/choose-plan?canceled=true`,

      // Permet de retrouver plus facilement l'utilisateur
      // dans Stripe.
      client_reference_id: userId,

      metadata: {
        userId,
        checkoutType: trial ? "TRIAL" : "PRO",
      },

      subscription_data: {
        metadata: {
          userId,
          checkoutType: trial ? "TRIAL" : "PRO",
        },
      },
    };

    // ============================================================
    // 7. AJOUTER LES 3 JOURS UNIQUEMENT POUR L'ESSAI
    // ============================================================
    if (trial) {
      sessionConfig.subscription_data = {
        ...sessionConfig.subscription_data,
        trial_period_days: 3,
      };
    }

   
    // ============================================================
    // 8. CLIENT STRIPE
    // ============================================================

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
      });

      customerId = customer.id;

      await sql`
        UPDATE "User"
        SET "stripeCustomerId" = ${customerId}
        WHERE id = ${userId}
      `;
    }

    sessionConfig.customer = customerId;


    // ============================================================
    // 9. CRÉER CHECKOUT
    // ============================================================
    const checkoutSession =
      await stripe.checkout.sessions.create(sessionConfig);

    if (!checkoutSession.url) {
      throw new Error(
        "Stripe n'a retourné aucune URL de Checkout."
      );
    }

    return NextResponse.json(
      {
        url: checkoutSession.url,
        checkoutType: trial ? "TRIAL" : "PRO",
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error(
      "❌ Erreur Stripe Checkout :",
      error.message
    );

    return NextResponse.json(
      {
        error:
          "Erreur lors de la création de la session Checkout.",
      },
      { status: 500 }
    );
  }
}