import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { userHasCourseAccess, formatYen, courseProgress } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/db";
import { isLocale, localize, type Locale } from "@/lib/locale";
import { EnrollActions } from "@/components/EnrollActions";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  const db = await ensureBootstrapped();
  const row = db.prepare(`SELECT * FROM courses WHERE slug = ? AND is_published = 1`).get(slug) as
    | Record<string, unknown>
    | undefined;
  if (!row) notFound();

  const course = localize(row, locale, ["title", "summary", "description"]) as {
    id: string;
    slug: string;
    title: string;
    summary: string;
    description: string;
    category: string;
    level: string;
    price_jpy: number;
    is_free: number;
    duration_hours: number;
  };

  const lessons = (
    db
      .prepare(`SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC`)
      .all(course.id) as Record<string, unknown>[]
  ).map((l) => localize(l, locale, ["title"]));

  const user = await getSessionUser();
  const hasAccess = user ? userHasCourseAccess(user.id, course.id) : false;
  const progress = user && hasAccess ? courseProgress(user.id, course.id) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <span className="badge">{course.category}</span>
          <span className="badge">
            {t.level}: {course.level}
          </span>
          <span className="badge">
            {course.duration_hours} {t.hours}
          </span>
        </div>
        <h1 className="font-display text-4xl text-white">{course.title}</h1>
        <p className="text-lg text-mist">{course.summary}</p>
        <div className="surface prose-nexora p-6 whitespace-pre-wrap text-sm">{course.description}</div>

        <div className="space-y-3">
          <h2 className="font-display text-2xl text-white">{t.curriculum}</h2>
          {lessons.map((lesson, i) => (
            <div key={String(lesson.id)} className="surface flex items-center justify-between gap-3 p-4">
              <div>
                <div className="text-xs text-mist-muted">#{i + 1}</div>
                <div className="text-white">{String(lesson.title)}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-mist-muted">
                {Number(lesson.is_preview) === 1 && <span className="text-signal">{t.preview}</span>}
                <span>{Number(lesson.duration_min)} min</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="surface sticky top-24 h-fit space-y-5 p-6">
        <div className="font-display text-3xl text-signal">
          {course.is_free ? t.free : formatYen(course.price_jpy, locale)}
        </div>
        {progress && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-mist">
              <span>{t.progress}</span>
              <span>{progress.pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-700">
              <div className="h-full bg-signal" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>
        )}
        {hasAccess ? (
          <Link href={`/${locale}/learn/${course.slug}`} className="btn-primary w-full">
            {t.continueLearning}
          </Link>
        ) : (
          <EnrollActions
            locale={locale}
            courseId={course.id}
            isFree={Boolean(course.is_free)}
            loggedIn={Boolean(user)}
            labels={{
              enroll: course.is_free ? t.startFree : t.buy,
              login: t.navLogin,
              stripePay: t.stripePay,
              localPay: t.localPay,
            }}
          />
        )}
        <p className="text-xs text-mist-muted">{t.subscribeNote}</p>
        <Link href={`/${locale}/instructor`} className="block text-sm text-signal">
          Sガンダム →
        </Link>
      </aside>
    </div>
  );
}
