import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Helper pour initialiser Neon uniquement à l'exécution
function getDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL est manquante.");
  return neon(dbUrl);
}

// Helper pour initialiser Stripe uniquement à l'exécution
function getStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY est manquante.");
  return new Stripe(stripeKey);
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_session")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    // 1. Initialiser la BDD et Stripe ici (au runtime)
    const sql = getDb();
    const stripe = getStripe();

    // 2. Récupérer l'utilisateur dans Neon
    const users = await sql`
      SELECT email, "stripeCustomerId" 
      FROM "User" 
      WHERE id = ${userId} 
      LIMIT 1
    `;

    const user = users[0];
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    // 3. Préparer la configuration de la session Checkout
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.nextUrl.origin}/dashboard?success=true`,
      cancel_url: `${req.nextUrl.origin}/dashboard?canceled=true`,
    };

    // 4. Associer le client existant ou pré-remplir avec son email
    if (user.stripeCustomerId) {
      sessionConfig.customer = user.stripeCustomerId;
    } else {
      sessionConfig.customer_email = user.email;
    }

    // 5. Créer la session Stripe Checkout
    const checkoutSession = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: checkoutSession.url }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Erreur Stripe Checkout :", error.message);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session Checkout." },
      { status: 500 }
    );
  }
}