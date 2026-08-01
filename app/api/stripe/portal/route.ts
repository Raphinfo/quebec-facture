import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_session")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    // 1. Récupérer l'utilisateur
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

    // 2. Si pas d'ID Stripe, on en crée un automatiquement chez Stripe
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
      });
      customerId = customer.id;

      // On sauvegarde l'ID fraîchement créé dans Neon
      await sql`
        UPDATE "User"
        SET "stripeCustomerId" = ${customerId}
        WHERE id = ${userId}
      `;
    }

    // 3. Créer la session du Portail Client
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