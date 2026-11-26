import Stripe from "stripe";
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe non configuré.");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
export function appOrigin() {
  if (!process.env.APP_URL) throw new Error("APP_URL manquante.");
  const url = new URL(process.env.APP_URL);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new Error("HTTPS requis.");
  return url.origin;
}
