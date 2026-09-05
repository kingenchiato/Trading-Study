import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/locale";
import {
  fulfillCoursePurchase,
  fulfillLiveBooking,
  fulfillSubscription,
} from "@/lib/commerce";
import { getStripe } from "@/lib/stripe";

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string; session_id?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  const { order, session_id } = await searchParams;
  const user = await getSessionUser();

  if (user && order) {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM orders WHERE id = ? AND user_id = ?`).get(order, user.id) as
      | { id: string; kind: string; reference_id: string; status: string }
      | undefined;
    if (row && row.status !== "paid") {
      const stripe = getStripe();
      let paid = !session_id;
      if (stripe && session_id) {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        paid = session.payment_status === "paid" || session.status === "complete";
      }
      if (paid) {
        if (row.kind === "course") fulfillCoursePurchase(user.id, row.reference_id, row.id);
        if (row.kind === "plan") fulfillSubscription(user.id, row.reference_id, row.id, 30);
        if (row.kind === "live") fulfillLiveBooking(user.id, row.reference_id, row.id);
      }
    }
  }

  return (
    <div className="surface mx-auto max-w-lg space-y-4 p-8 text-center">
      <div className="text-signal">✓</div>
      <h1 className="font-display text-3xl text-white">{t.checkoutSuccess}</h1>
      <Link href={`/${locale}/dashboard`} className="btn-primary inline-flex">
        {t.navDashboard}
      </Link>
    </div>
  );
}
