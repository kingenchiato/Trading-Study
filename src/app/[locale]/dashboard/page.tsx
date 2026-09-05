import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { courseProgress } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/db";
import { isLocale, localize, type Locale } from "@/lib/locale";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/dashboard`);

  const db = await ensureBootstrapped();
  const enrollments = (
    db
      .prepare(
        `SELECT c.* FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         WHERE e.user_id = ?
         ORDER BY e.created_at DESC`,
      )
      .all(user.id) as Record<string, unknown>[]
  ).map((c) => localize(c, locale, ["title", "summary"]));

  const certs = (
    db
      .prepare(
        `SELECT cert.*, c.title_ja, c.title_en, c.slug FROM certificates cert
         JOIN courses c ON c.id = cert.course_id
         WHERE cert.user_id = ?
         ORDER BY cert.issued_at DESC`,
      )
      .all(user.id) as Record<string, unknown>[]
  ).map((c) => localize(c, locale, ["title"]));

  const sub = db
    .prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
    )
    .get(user.id) as { plan_code: string; current_period_end: string | null } | undefined;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-4xl text-white">{t.dashboardTitle}</h1>
        <p className="mt-2 text-mist">
          {user.name} · {user.email}
          {sub ? ` · Plan: ${sub.plan_code}` : ""}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-white">{t.continueLearning}</h2>
        {enrollments.length === 0 ? (
          <div className="surface p-6 text-mist">
            <Link href={`/${locale}/courses`} className="text-signal">
              {t.ctaCourses}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {enrollments.map((c) => {
              const progress = courseProgress(user.id, String(c.id));
              return (
                <Link
                  key={String(c.id)}
                  href={`/${locale}/learn/${String(c.slug)}`}
                  className="surface flex flex-col gap-3 p-5 transition hover:border-signal/40 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-display text-lg text-white">{String(c.title)}</div>
                    <div className="text-sm text-mist">{String(c.summary)}</div>
                  </div>
                  <div className="w-full md:w-48">
                    <div className="mb-1 flex justify-between text-xs text-mist-muted">
                      <span>{t.progress}</span>
                      <span>{progress.pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-700">
                      <div className="h-full bg-signal" style={{ width: `${progress.pct}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-white">{t.certificates}</h2>
        {certs.length === 0 ? (
          <p className="text-mist">{t.noCertificates}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {certs.map((cert) => (
              <Link
                key={String(cert.id)}
                href={`/${locale}/certificates/${String(cert.code)}`}
                className="surface p-5 hover:border-signal/40"
              >
                <div className="text-xs text-signal">{String(cert.code)}</div>
                <div className="mt-2 font-display text-lg text-white">{String(cert.title)}</div>
                <div className="mt-1 text-xs text-mist-muted">{String(cert.issued_at)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
