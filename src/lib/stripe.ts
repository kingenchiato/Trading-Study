import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("xxx")) return null;
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export function stripeEnabled() {
  return Boolean(getStripe());
}

export function localCheckoutAllowed() {
  return process.env.ALLOW_LOCAL_CHECKOUT === "true" || !stripeEnabled();
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
