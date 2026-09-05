import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  fulfillCoursePurchase,
  fulfillLiveBooking,
  fulfillSubscription,
} from "@/lib/commerce";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe disabled" }, { status: 400 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.includes("xxx")) {
    return NextResponse.json({ error: "Webhook secret missing" }, { status: 400 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      metadata?: Record<string, string>;
    };
    const meta = session.metadata || {};
    const orderId = meta.orderId;
    const userId = meta.userId;
    const kind = meta.kind;
    const referenceId = meta.referenceId;
    const days = Number(meta.days || 30);
    if (orderId && userId && kind && referenceId) {
      if (kind === "course") fulfillCoursePurchase(userId, referenceId, orderId);
      if (kind === "plan") fulfillSubscription(userId, referenceId, orderId, days);
      if (kind === "live") fulfillLiveBooking(userId, referenceId, orderId);
      getDb()
        .prepare(`UPDATE orders SET stripe_session_id = ?, status = 'paid' WHERE id = ?`)
        .run(session.id, orderId);
    }
  }

  return NextResponse.json({ received: true });
}

/** Manual confirm helper when returning from Stripe success page without webhook. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order");
  const sessionId = searchParams.get("session_id");
  if (!orderId) return NextResponse.json({ error: "Missing order" }, { status: 400 });

  const db = getDb();
  const order = db.prepare(`SELECT * FROM orders WHERE id = ? AND user_id = ?`).get(orderId, user.id) as
    | {
        id: string;
        kind: string;
        reference_id: string;
        status: string;
        meta_json: string | null;
      }
    | undefined;
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ ok: true });

  const stripe = getStripe();
  if (stripe && sessionId) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "Unpaid" }, { status: 402 });
    }
  } else if (!localAllowedFallback()) {
    return NextResponse.json({ error: "Cannot confirm" }, { status: 402 });
  }

  const days = 30;
  if (order.kind === "course") fulfillCoursePurchase(user.id, order.reference_id, order.id);
  if (order.kind === "plan") fulfillSubscription(user.id, order.reference_id, order.id, days);
  if (order.kind === "live") fulfillLiveBooking(user.id, order.reference_id, order.id);

  return NextResponse.json({ ok: true });
}

function localAllowedFallback() {
  return process.env.ALLOW_LOCAL_CHECKOUT === "true";
}
