import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

// ============================================================
// STRIPE
// ============================================================
function getStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    throw new Error("STRIPE_SECRET_KEY n'est pas définie.");
  }

  return new Stripe(stripeKey);
}

// ============================================================
// NEON
// ============================================================
function getDb() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error("DATABASE_URL n'est pas définie.");
  }

  return neon(dbUrl);
}

// ============================================================
// WEBHOOK
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const sql = getDb();

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("❌ STRIPE_WEBHOOK_SECRET non défini");

      return NextResponse.json(
        { error: "Configuration webhook manquante." },
        { status: 500 }
      );
    }

    // Stripe exige le corps brut
    const body = await req.text();

    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json(
        { error: "Signature Stripe manquante." },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      console.error(
        `❌ Erreur signature Webhook Stripe : ${err.message}`
      );

      return NextResponse.json(
        { error: `Signature invalide : ${err.message}` },
        { status: 400 }
      );
    }

    console.log(`ℹ️ Événement Stripe reçu : ${event.type}`);

    switch (event.type) {

      // ============================================================
      // 1. CHECKOUT TERMINÉ
      // ============================================================
      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const stripeCustomerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id || null;

        const stripeSubId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id || null;

        const userEmail =
          (
            session.customer_details?.email ||
            session.customer_email
          )
            ?.trim()
            .toLowerCase() || null;

        if (!userEmail) {
          console.warn(
            "⚠️ Aucun courriel trouvé dans la session Checkout."
          );
          break;
        }

        if (!stripeSubId) {
          console.warn(
            "⚠️ Aucun abonnement Stripe trouvé dans la session Checkout."
          );
          break;
        }

        try {
          // Récupération du vrai statut de l'abonnement Stripe
          const subscription =
            await stripe.subscriptions.retrieve(stripeSubId);

          const subscriptionStatus =
            subscription.status === "trialing"
              ? "TRIALING"
              : "ACTIVE";

          const result = await sql`
            UPDATE "User"
            SET
              "plan" = 'PRO',
              "subscriptionStatus" = ${subscriptionStatus},
              "stripeCustomerId" = ${stripeCustomerId},
              "stripeSubId" = ${stripeSubId}
            WHERE LOWER(email) = ${userEmail}
            RETURNING
              id,
              email,
              plan,
              "subscriptionStatus"
          `;

          if (result.length > 0) {
            console.log(
              `🎉 ${result[0].email} → PRO / ${subscriptionStatus}`
            );
          } else {
            console.error(
              `❌ Aucun utilisateur trouvé pour ${userEmail}`
            );
          }
        } catch (dbError: any) {
          console.error(
            "❌ Erreur checkout.session.completed :",
            dbError.message
          );

          return NextResponse.json(
            { error: "Erreur base de données." },
            { status: 500 }
          );
        }

        break;
      }

      // ============================================================
      // 2. ABONNEMENT MODIFIÉ
      // ============================================================
      case "customer.subscription.updated": {
        const subscription =
          event.data.object as Stripe.Subscription;

        let subscriptionStatus:
          | "TRIALING"
          | "ACTIVE"
          | "PAST_DUE"
          | "CANCELED";

        switch (subscription.status) {
          case "trialing":
            subscriptionStatus = "TRIALING";
            break;

          case "active":
            subscriptionStatus = "ACTIVE";
            break;

          case "past_due":
          case "unpaid":
            subscriptionStatus = "PAST_DUE";
            break;

          case "canceled":
            subscriptionStatus = "CANCELED";
            break;

          default:
            console.log(
              `ℹ️ Statut Stripe non traité : ${subscription.status}`
            );
            break;
        }

        if (
          subscription.status === "trialing" ||
          subscription.status === "active" ||
          subscription.status === "past_due" ||
          subscription.status === "unpaid" ||
          subscription.status === "canceled"
        ) {
          try {
            const status =
              subscription.status === "trialing"
                ? "TRIALING"
                : subscription.status === "active"
                ? "ACTIVE"
                : subscription.status === "canceled"
                ? "CANCELED"
                : "PAST_DUE";

            await sql`
              UPDATE "User"
              SET "subscriptionStatus" = ${status}
              WHERE "stripeSubId" = ${subscription.id}
            `;

            console.log(
              `🔄 Abonnement ${subscription.id} → ${status}`
            );
          } catch (dbError: any) {
            console.error(
              "❌ Erreur customer.subscription.updated :",
              dbError.message
            );

            return NextResponse.json(
              { error: "Erreur base de données." },
              { status: 500 }
            );
          }
        }

        break;
      }

      // ============================================================
      // 3. PAIEMENT / RENOUVELLEMENT RÉUSSI
      // ============================================================
      case "invoice.payment_succeeded": {
        const invoice =
          event.data.object as Stripe.Invoice;

        const stripeCustomerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id || null;

        if (!stripeCustomerId) {
          console.warn(
            "⚠️ Aucun Stripe Customer ID dans la facture."
          );
          break;
        }

        try {
          const result = await sql`
            UPDATE "User"
            SET
              "plan" = 'PRO',
              "subscriptionStatus" = 'ACTIVE'
            WHERE "stripeCustomerId" = ${stripeCustomerId}
            RETURNING id, email
          `;

          if (result.length > 0) {
            console.log(
              `💳 Paiement réussi pour ${result[0].email} → PRO / ACTIVE`
            );
          }
        } catch (dbError: any) {
          console.error(
            "❌ Erreur invoice.payment_succeeded :",
            dbError.message
          );

          return NextResponse.json(
            { error: "Erreur base de données." },
            { status: 500 }
          );
        }

        break;
      }

      // ============================================================
      // 4. PAIEMENT ÉCHOUÉ
      // ============================================================
      case "invoice.payment_failed": {
        const invoice =
          event.data.object as Stripe.Invoice;

        const stripeCustomerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id || null;

        if (!stripeCustomerId) {
          break;
        }

        try {
          const result = await sql`
            UPDATE "User"
            SET
              "subscriptionStatus" = 'PAST_DUE'
            WHERE "stripeCustomerId" = ${stripeCustomerId}
            RETURNING id, email
          `;

          if (result.length > 0) {
            console.warn(
              `⚠️ Paiement échoué pour ${result[0].email}`
            );
          }
        } catch (dbError: any) {
          console.error(
            "❌ Erreur invoice.payment_failed :",
            dbError.message
          );

          return NextResponse.json(
            { error: "Erreur base de données." },
            { status: 500 }
          );
        }

        break;
      }

      // ============================================================
      // 5. ABONNEMENT TERMINÉ / SUPPRIMÉ
      // ============================================================
      case "customer.subscription.deleted": {
        const subscription =
          event.data.object as Stripe.Subscription;

        try {
          const result = await sql`
            UPDATE "User"
            SET
              "plan" = 'FREE',
              "subscriptionStatus" = 'ACTIVE',
              "stripeSubId" = NULL
            WHERE "stripeSubId" = ${subscription.id}
            RETURNING id, email
          `;

          if (result.length > 0) {
            console.log(
              `🚪 Abonnement terminé pour ${result[0].email} → FREE / ACTIVE`
            );
          } else {
            console.warn(
              `⚠️ Aucun utilisateur trouvé avec l'abonnement ${subscription.id}`
            );
          }
        } catch (dbError: any) {
          console.error(
            "❌ Erreur customer.subscription.deleted :",
            dbError.message
          );

          return NextResponse.json(
            { error: "Erreur base de données." },
            { status: 500 }
          );
        }

        break;
      }

      // ============================================================
      // AUTRES ÉVÉNEMENTS
      // ============================================================
      default:
        console.log(
          `ℹ️ Événement Stripe ignoré : ${event.type}`
        );
    }

    return NextResponse.json(
      { received: true },
      { status: 200 }
    );

  } catch (error: any) {
    console.error(
      "❌ Erreur générale webhook Stripe :",
      error.message
    );

    return NextResponse.json(
      { error: "Erreur interne du webhook." },
      { status: 500 }
    );
  }
}