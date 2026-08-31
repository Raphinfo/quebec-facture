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

    // 2. Récupérer l'utilisateur
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

   let customerId = user.stripeCustomerId;

// ============================================================
// CRÉER LE CLIENT STRIPE
// ============================================================

if (!customerId) {
  const testClockId =
    process.env.STRIPE_TEST_CLOCK_ID || null;

  const customer = await stripe.customers.create({
    email: user.email,

    // Seulement utilisé lorsqu'une Test Clock est configurée
    ...(testClockId
      ? {
          test_clock: testClockId,
        }
      : {}),
  });

  customerId = customer.id;

      // On sauvegarde l'ID fraîchement créé dans Neon
      await sql`
        UPDATE "User"
        SET "stripeCustomerId" = ${customerId}
        WHERE id = ${userId}
      `;
    }

    // 4. Créer la session du Portail Client
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.nextUrl.origin}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Erreur Stripe Portal :", error.message);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session portail." },
      { status: 500 }
    );
  }
}