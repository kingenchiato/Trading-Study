import { redirect, notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { formatYen } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/locale";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/admin`);
  if (user.role !== "admin") {
    return <div className="surface p-8 text-ember-soft">{t.accessDenied}</div>;
  }

  const db = await ensureBootstrapped();
  const learners = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'learner'`).get() as { c: number }).c;
  const revenue = (
    db.prepare(`SELECT COALESCE(SUM(amount_jpy),0) as s FROM orders WHERE status = 'paid'`).get() as {
      s: number;
    }
  ).s;
  const orders = db
    .prepare(
      `SELECT o.*, u.email FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 20`,
    )
    .all() as {
    id: string;
    kind: string;
    amount_jpy: number;
    status: string;
    email: string;
    created_at: string;
  }[];
  const leads = db
    .prepare(`SELECT * FROM team_leads ORDER BY created_at DESC LIMIT 20`)
    .all() as {
    id: string;
    company: string;
    contact_name: string;
    email: string;
    seats: number;
    status: string;
    created_at: string;
  }[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-white">{t.adminTitle}</h1>
        <p className="mt-2 text-mist">Sガンダム · {user.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface p-5">
          <div className="text-xs uppercase tracking-wider text-mist-muted">{t.revenue}</div>
          <div className="mt-2 font-display text-3xl text-signal">{formatYen(revenue, locale)}</div>
        </div>
        <div className="surface p-5">
          <div className="text-xs uppercase tracking-wider text-mist-muted">{t.learners}</div>
          <div className="mt-2 font-display text-3xl text-white">{learners}</div>
        </div>
        <div className="surface p-5">
          <div className="text-xs uppercase tracking-wider text-mist-muted">{t.teamLeads}</div>
          <div className="mt-2 font-display text-3xl text-white">{leads.length}</div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-white">{t.orders}</h2>
        <div className="surface overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-mist-muted">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-white/5 text-mist">
                  <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 12)}</td>
                  <td className="px-4 py-3">{o.kind}</td>
                  <td className="px-4 py-3">{o.email}</td>
                  <td className="px-4 py-3 text-signal">{formatYen(o.amount_jpy, locale)}</td>
                  <td className="px-4 py-3">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-white">{t.teamLeads}</h2>
        <div className="grid gap-3">
          {leads.map((l) => (
            <div key={l.id} className="surface p-4 text-sm text-mist">
              <div className="font-display text-white">
                {l.company} · {l.contact_name}
              </div>
              <div>
                {l.email} · {l.seats} seats · {l.status}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
