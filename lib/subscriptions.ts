import type Stripe from "stripe";
export function subscriptionState(subscription: Stripe.Subscription) {
  const active = ["active", "trialing"].includes(subscription.status);
  const terminal = ["canceled", "incomplete_expired"].includes(
    subscription.status,
  );
  const status =
    subscription.status === "trialing"
      ? "TRIALING"
      : subscription.status === "active"
        ? "ACTIVE"
        : terminal
          ? "CANCELED"
          : "PAST_DUE";
  const end =
    subscription.status === "trialing"
      ? subscription.trial_end
      : subscription.items.data[0]?.current_period_end;
  return {
    active,
    terminal,
    status,
    validUntil: active && end ? new Date(end * 1000).toISOString() : null,
  };
}
