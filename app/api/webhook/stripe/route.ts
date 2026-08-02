import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

// Fallbacks pour éviter les erreurs "Failed to collect page data" pendant le build Vercel
const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_for_build";
const dbUrl = process.env.DATABASE_URL || "postgres://placeholder:placeholder@localhost:5432/db";

const stripe = new Stripe(stripeKey);
const sql = neon(dbUrl);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`❌ Erreur signature Webhook : ${err.message}`);
    return NextResponse.json({ error: `Erreur: ${err.message}` }, { status: 400 });
  }

  console.log(`ℹ️ Événement Stripe reçu : ${event.type}`);

  switch (event.type) {
    // 🟢 1. NOUVEAU PAIEMENT VALIDÉ DANS CHECKOUT
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const stripeCustId = (session.customer as string) || null;
      const stripeSubId = (session.subscription as string) || null;
      const userEmail = (
        session.customer_details?.email || 
        session.customer_email
      )?.trim().toLowerCase();

      if (userEmail) {
        try {
          const result = await sql`
            UPDATE "User"
            SET 
              "plan" = 'PRO',
              "subscriptionStatus" = 'ACTIVE',
              "stripeCustomerId" = ${stripeCustId},
              "stripeSubId" = ${stripeSubId}
            WHERE LOWER(email) = ${userEmail}
            RETURNING id, email, plan, "subscriptionStatus"
          `;

          if (result.length > 0) {
            console.log(`🎉 SUCCÈS AUTO : Utilisateur ${result[0].email} mis à jour au plan PRO !`);
          } else {
            console.error(`❌ Aucun utilisateur Neon trouvé pour l'email : "${userEmail}"`);
          }
        } catch (dbError: any) {
          console.error("❌ Erreur SQL Checkout Webhook :", dbError.message);
        }
      }
      break;
    }

    // 🟢 2. RENOUVELLEMENT DE FACTURE MENSUELLE RÉUSSI
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustId = (invoice.customer as string) || null;

      if (stripeCustId) {
        try {
          await sql`
            UPDATE "User"
            SET 
              "plan" = 'PRO',
              "subscriptionStatus" = 'ACTIVE'
            WHERE "stripeCustomerId" = ${stripeCustId}
          `;
          console.log(`✅ Renouvellement d'abonnement réussi pour le client ${stripeCustId}`);
        } catch (dbError: any) {
          console.error("❌ Erreur SQL Invoice Webhook :", dbError.message);
        }
      }
      break;
    }

    // 🔴 3. ANNULATION DE L'ABONNEMENT (Via Portail Client Stripe)
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      try {
        await sql`
          UPDATE "User"
          SET 
            "plan" = 'FREE',
            "subscriptionStatus" = 'CANCELED',
            "stripeSubId" = NULL
          WHERE "stripeSubId" = ${subscription.id}
        `;
        console.log(`❌ Abonnement résilié -> Passage automatique du compte en FREE.`);
      } catch (dbError: any) {
        console.error("❌ Erreur SQL Résiliation Webhook :", dbError.message);
      }
      break;
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}