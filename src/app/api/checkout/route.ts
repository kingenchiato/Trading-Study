import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  createPendingOrder,
  fulfillCoursePurchase,
  fulfillLiveBooking,
  fulfillSubscription,
} from "@/lib/commerce";
import { ensureBootstrapped, getDb } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";
import { appUrl, getStripe, localCheckoutAllowed, stripeEnabled } from "@/lib/stripe";

const schema = z.object({
  kind: z.enum(["course", "plan", "live"]),
  referenceId: z.string().min(1),
  mode: z.enum(["stripe", "local"]).default("stripe"),
  locale: z.string().default("ja"),
});

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureBootstrapped();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { kind, referenceId, mode, locale } = parsed.data;
  const db = getDb();

  let amount = 0;
  let title = "NEXORA";
  let days = 30;

  if (kind === "course") {
    const course = db.prepare(`SELECT * FROM courses WHERE id = ?`).get(referenceId) as
      | { id: string; title_ja: string; title_en: string; price_jpy: number; is_free: number }
      | undefined;
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    amount = course.is_free ? 0 : course.price_jpy;
    title = locale === "en" ? course.title_en : course.title_ja;
  } else if (kind === "plan") {
    const plan = db.prepare(`SELECT * FROM plans WHERE code = ? AND is_active = 1`).get(referenceId) as
      | { code: string; name_ja: string; name_en: string; price_jpy: number; interval: string }
      | undefined;
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    amount = plan.price_jpy;
    title = locale === "en" ? plan.name_en : plan.name_ja;
    days = plan.interval === "year" ? 365 : 30;
  } else {
    const session = db.prepare(`SELECT * FROM live_sessions WHERE id = ?`).get(referenceId) as
      | { id: string; title_ja: string; title_en: string; price_jpy: number; capacity: number }
      | undefined;
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const booked = (
      db
        .prepare(`SELECT COUNT(*) as c FROM live_bookings WHERE session_id = ? AND status = 'confirmed'`)
        .get(referenceId) as { c: number }
    ).c;
    if (booked >= session.capacity) {
      return NextResponse.json({ error: "Session full" }, { status: 409 });
    }
    amount = session.price_jpy;
    title = locale === "en" ? session.title_en : session.title_ja;
  }

  const orderId = createPendingOrder({
    userId: user.id,
    kind,
    referenceId,
    amount,
    meta: { title },
  });

  const useLocal = mode === "local" || amount === 0 || !stripeEnabled();
  if (useLocal) {
    if (amount > 0 && !localCheckoutAllowed() && mode === "local") {
      return NextResponse.json({ error: "Local checkout disabled" }, { status: 403 });
    }
    if (kind === "course") fulfillCoursePurchase(user.id, referenceId, orderId);
    if (kind === "plan") fulfillSubscription(user.id, referenceId, orderId, days);
    if (kind === "live") fulfillLiveBooking(user.id, referenceId, orderId);
    return NextResponse.json({
      redirect: `/${locale}/checkout/success?order=${orderId}`,
    });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  const checkout = await stripe.checkout.sessions.create({
    mode: kind === "plan" ? "subscription" : "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: amount,
          product_data: { name: `NEXORA — ${title}` },
          ...(kind === "plan"
            ? { recurring: { interval: days >= 365 ? "year" : "month" } }
            : {}),
        },
      },
    ],
    success_url: `${appUrl()}/${locale}/checkout/success?order=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/${locale}/checkout/cancel`,
    metadata: {
      orderId,
      userId: user.id,
      kind,
      referenceId,
      days: String(days),
    },
  });

  db.prepare(`UPDATE orders SET stripe_session_id = ? WHERE id = ?`).run(checkout.id, orderId);

  return NextResponse.json({ url: checkout.url });
}
