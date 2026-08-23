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
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_session")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      throw new Error("STRIPE_PRICE_ID est manquante.");
    }

    const sql = getDb();
    const stripe = getStripe();

    const users = await sql`
      SELECT
        email,
        "stripeCustomerId"
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

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      mode: "subscription",

      // Essai gratuit de 3 jours.
      // La carte est enregistrée, mais aucun prélèvement immédiat.
      subscription_data: {
        trial_period_days: 3,
      },

      success_url: `${req.nextUrl.origin}/dashboard?success=true`,
      cancel_url: `${req.nextUrl.origin}/choose-plan?canceled=true`,
    };

    if (user.stripeCustomerId) {
      sessionConfig.customer = user.stripeCustomerId;
    } else {
      sessionConfig.customer_email = user.email;
    }

    const checkoutSession =
      await stripe.checkout.sessions.create(sessionConfig);

    if (!checkoutSession.url) {
      throw new Error(
        "Stripe n'a retourné aucune URL de Checkout."
      );
    }

    return NextResponse.json(
      { url: checkoutSession.url },
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
          "Erreur lors de la création de la session Checkout."
      },
      { status: 500 }
    );
  }
}