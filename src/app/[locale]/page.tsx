import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseCard } from "@/components/CourseCard";
import { MarketPriceChart } from "@/components/MarketPriceChart";
import { getDictionary } from "@/i18n/dictionaries";
import { ensureBootstrapped } from "@/lib/db";
import { isLocale, localize, type Locale } from "@/lib/locale";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  const db = await ensureBootstrapped();

  const courses = (
    db
      .prepare(
        `SELECT * FROM courses WHERE is_published = 1 ORDER BY is_free DESC, price_jpy ASC LIMIT 3`,
      )
      .all() as Record<string, unknown>[]
  ).map((c) => localize(c, locale, ["title", "summary"]) as typeof c & { title: string; summary: string; slug: string; category: string; level: string; price_jpy: number; is_free: number; duration_hours: number });

  const lives = (
    db
      .prepare(
        `SELECT * FROM live_sessions WHERE is_published = 1 AND starts_at > datetime('now') ORDER BY starts_at ASC LIMIT 2`,
      )
      .all() as Record<string, unknown>[]
  ).map((s) => localize(s, locale, ["title", "summary"]));

  return (
    <div className="space-y-20">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-ink-900/80 p-8 shadow-panel md:p-14">
        <div className="pointer-events-none absolute -right-10 top-0 h-64 w-64 rounded-full bg-signal/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-10 h-48 w-48 rounded-full bg-ember/10 blur-3xl" />

        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="animate-fade-up space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-xs font-medium text-signal">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-signal" />
              ONLINE TRAINING PLATFORM · JAPAN
            </div>
            <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
              {t.heroTitle}
            </h1>
            <p className="max-w-2xl text-base text-mist md:text-lg">{t.heroSub}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/${locale}/register`} className="btn-primary">
                {t.ctaStart}
              </Link>
              <Link href={`/${locale}/courses`} className="btn-ghost">
                {t.ctaCourses}
              </Link>
              <Link href={`/${locale}/pricing`} className="btn-ghost">
                {t.ctaPricing}
              </Link>
            </div>
          </div>

          <div className="animate-fade-up surface relative p-6" style={{ animationDelay: "120ms" }}>
            <div className="mb-4 text-xs uppercase tracking-[0.24em] text-signal">{t.trustLine}</div>
            <div className="flex items-center gap-4">
              <Image
                src="/admin-avatar.png?v=sgundam"
                alt="Sガンダム"
                width={96}
                height={96}
                priority
                className="h-24 w-24 rounded-2xl border border-signal/50 object-cover shadow-signal"
              />
              <div>
                <div className="font-display text-3xl text-white">Sガンダム</div>
                <div className="mt-1 text-sm text-mist">Founder · Lead Instructor</div>
                <div className="mt-3 text-xs text-mist-muted">NEXORA / Tokyo · Remote-first</div>
              </div>
            </div>
            <p className="mt-5 border-t border-white/10 pt-5 text-sm leading-relaxed text-mist">
              {t.instructorBio}
            </p>
          </div>
        </div>
      </section>

      <MarketPriceChart locale={locale} t={t} />

      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-white">{t.featured}</h2>
            <p className="mt-1 text-sm text-mist-muted">{t.coursesSub}</p>
          </div>
          <Link href={`/${locale}/courses`} className="text-sm text-signal hover:text-signal-glow">
            {t.ctaCourses} →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.slug} locale={locale} t={t} course={course} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <h2 className="font-display text-2xl text-white md:col-span-3">{t.whyTitle}</h2>
        {[
          { t: t.why1t, d: t.why1d },
          { t: t.why2t, d: t.why2d },
          { t: t.why3t, d: t.why3d },
        ].map((item) => (
          <div key={item.t} className="surface p-6">
            <div className="mb-3 h-1 w-10 bg-signal" />
            <h3 className="font-display text-lg text-white">{item.t}</h3>
            <p className="mt-2 text-sm text-mist">{item.d}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-6 font-display text-2xl text-white">{t.liveUpcoming}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {lives.map((s) => (
            <Link
              key={String(s.slug)}
              href={`/${locale}/live`}
              className="surface flex flex-col gap-3 p-6 transition hover:border-signal/40"
            >
              <div className="text-xs uppercase tracking-wider text-ember-soft">LIVE</div>
              <h3 className="font-display text-xl text-white">{String(s.title)}</h3>
              <p className="text-sm text-mist">{String(s.summary)}</p>
              <div className="mt-auto text-xs text-mist-muted">
                {new Date(String(s.starts_at)).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
