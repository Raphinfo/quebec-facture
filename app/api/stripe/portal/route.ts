import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/http";
import { InputError } from "@/lib/validation";
import { getStripe, appOrigin } from "@/lib/stripe";
export async function POST() {
  try {
    const userId = await requireUser();
    const [user] =
      await getDb()`SELECT "stripeCustomerId" FROM "User" WHERE id=${userId}`;
    if (!user.stripeCustomerId)
      throw new InputError("Aucun compte de facturation associé.", 404);
    const session = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appOrigin()}/dashboard?tab=subscription`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiError(error);
  }
}
