import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { formatYen } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isLocale, localize, type Locale } from "@/lib/locale";
import { LiveBookButton } from "@/components/LiveBookButton";

export default async function LivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  const user = await getSessionUser();
  const db = getDb();

  const sessions = (
    db
      .prepare(
        `SELECT s.*,
          (SELECT COUNT(*) FROM live_bookings b WHERE b.session_id = s.id AND b.status = 'confirmed') as booked
         FROM live_sessions s
         WHERE s.is_published = 1
         ORDER BY s.starts_at ASC`,
      )
      .all() as Record<string, unknown>[]
  ).map((s) => localize(s, locale, ["title", "summary"]));

  const myBookings = user
    ? (db
        .prepare(`SELECT session_id FROM live_bookings WHERE user_id = ?`)
        .all(user.id) as { session_id: string }[]).map((b) => b.session_id)
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-white">{t.liveTitle}</h1>
        <p className="mt-2 text-mist">{t.liveSub}</p>
      </div>
      <div className="grid gap-4">
        {sessions.map((s) => {
          const left = Number(s.capacity) - Number(s.booked);
          const booked = myBookings.includes(String(s.id));
          return (
            <div key={String(s.id)} className="surface grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="text-xs uppercase tracking-wider text-ember-soft">LIVE WORKSHOP</div>
                <h2 className="mt-2 font-display text-2xl text-white">{String(s.title)}</h2>
                <p className="mt-2 text-sm text-mist">{String(s.summary)}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-mist-muted">
                  <span>
                    {new Date(String(s.starts_at)).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}
                  </span>
                  <span>
                    {Number(s.duration_min)} min
                  </span>
                  <span>
                    {t.seatsLeft}: {left}
                  </span>
                </div>
                {booked && Boolean(s.meeting_url) && (
                  <a href={String(s.meeting_url)} className="mt-3 inline-block text-sm text-signal" target="_blank" rel="noreferrer">
                    Meeting URL →
                  </a>
                )}
              </div>
              <div className="space-y-2 text-right">
                <div className="font-display text-2xl text-signal">{formatYen(Number(s.price_jpy), locale)}</div>
                {booked ? (
                  <div className="badge justify-end text-signal">{t.booked}</div>
                ) : (
                  <LiveBookButton
                    locale={locale}
                    sessionId={String(s.id)}
                    label={t.bookSeat}
                    disabled={left <= 0}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
