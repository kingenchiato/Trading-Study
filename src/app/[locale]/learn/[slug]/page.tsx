import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { courseProgress, userHasCourseAccess } from "@/lib/access";
import { certificateCode, getSessionUser, newId } from "@/lib/auth";
import { ensureBootstrapped, getDb } from "@/lib/db";
import { isLocale, localize, type Locale } from "@/lib/locale";
import { LessonActions } from "@/components/LessonActions";

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/learn/${slug}`);

  const db = await ensureBootstrapped();
  const courseRow = db.prepare(`SELECT * FROM courses WHERE slug = ?`).get(slug) as
    | Record<string, unknown>
    | undefined;
  if (!courseRow) notFound();
  const course = localize(courseRow, locale, ["title"]) as { id: string; title: string; slug: string };

  const lessons = (
    db.prepare(`SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order`).all(course.id) as Record<
      string,
      unknown
    >[]
  ).map((l) => localize(l, locale, ["title", "content"]));

  const previewOnly = lessons.filter((l) => Number(l.is_preview) === 1);
  const hasAccess = userHasCourseAccess(user.id, course.id);
  if (!hasAccess && previewOnly.length === 0) {
    redirect(`/${locale}/courses/${slug}`);
  }

  const accessible = hasAccess ? lessons : previewOnly;
  const { lesson: lessonId } = await searchParams;
  const active =
    accessible.find((l) => String(l.id) === lessonId) || accessible[0];
  if (!active) notFound();

  const completed = new Set(
    (
      db
        .prepare(`SELECT lesson_id FROM lesson_progress WHERE user_id = ?`)
        .all(user.id) as { lesson_id: string }[]
    ).map((r) => r.lesson_id),
  );

  const progress = courseProgress(user.id, course.id);
  const existingCert = db
    .prepare(`SELECT code FROM certificates WHERE user_id = ? AND course_id = ?`)
    .get(user.id, course.id) as { code: string } | undefined;

  async function issueCertificate() {
    "use server";
    const sessionUser = await getSessionUser();
    if (!sessionUser) return;
    const database = getDb();
    const prog = courseProgress(sessionUser.id, course.id);
    if (prog.pct < 100) return;
    const code = certificateCode(sessionUser.id, course.id);
    database
      .prepare(
        `INSERT OR IGNORE INTO certificates (id, code, user_id, course_id) VALUES (?, ?, ?, ?)`,
      )
      .run(newId("crt_"), code, sessionUser.id, course.id);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="surface h-fit p-4">
        <Link href={`/${locale}/courses/${slug}`} className="text-xs text-signal">
          ← {course.title}
        </Link>
        <div className="mt-4 mb-2 text-xs text-mist-muted">
          {t.progress}: {progress.pct}%
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
          <div className="h-full bg-signal" style={{ width: `${progress.pct}%` }} />
        </div>
        <div className="mt-4 space-y-1">
          {accessible.map((l, i) => (
            <Link
              key={String(l.id)}
              href={`/${locale}/learn/${slug}?lesson=${String(l.id)}`}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                String(l.id) === String(active.id)
                  ? "bg-signal/15 text-signal"
                  : "text-mist hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="mr-2 text-xs opacity-60">{i + 1}.</span>
              {String(l.title)}
              {completed.has(String(l.id)) ? " ✓" : ""}
            </Link>
          ))}
        </div>
      </aside>

      <section className="surface p-6 md:p-8">
        <div className="text-xs uppercase tracking-wider text-mist-muted">{t.lessonContent}</div>
        <h1 className="mt-2 font-display text-3xl text-white">{String(active.title)}</h1>
        <div className="prose-nexora mt-6 whitespace-pre-wrap text-sm">{String(active.content)}</div>
        {hasAccess && (
          <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-6">
            <LessonActions
              lessonId={String(active.id)}
              completed={completed.has(String(active.id))}
              labels={{ markComplete: t.markComplete, completed: t.completed }}
            />
            {progress.pct === 100 && (
              existingCert ? (
                <Link href={`/${locale}/certificates/${existingCert.code}`} className="btn-ghost">
                  {t.certificates}
                </Link>
              ) : (
                <form action={issueCertificate}>
                  <button className="btn-primary" type="submit">
                    {t.issueCert}
                  </button>
                </form>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
