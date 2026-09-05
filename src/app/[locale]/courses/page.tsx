import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseCard } from "@/components/CourseCard";
import { getDictionary } from "@/i18n/dictionaries";
import { ensureBootstrapped } from "@/lib/db";
import { isLocale, localize, type Locale } from "@/lib/locale";

export default async function CoursesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  const { q = "", category = "" } = await searchParams;
  const db = await ensureBootstrapped();

  const categories = db
    .prepare(`SELECT DISTINCT category FROM courses WHERE is_published = 1 ORDER BY category`)
    .all() as { category: string }[];

  let sql = `SELECT * FROM courses WHERE is_published = 1`;
  const args: string[] = [];
  if (category) {
    sql += ` AND category = ?`;
    args.push(category);
  }
  if (q) {
    sql += ` AND (title_ja LIKE ? OR title_en LIKE ? OR summary_ja LIKE ? OR summary_en LIKE ?)`;
    const like = `%${q}%`;
    args.push(like, like, like, like);
  }
  sql += ` ORDER BY is_free DESC, created_at DESC`;

  const courses = (db.prepare(sql).all(...args) as Record<string, unknown>[]).map(
    (c) =>
      localize(c, locale, ["title", "summary"]) as {
        slug: string;
        title: string;
        summary: string;
        category: string;
        level: string;
        price_jpy: number;
        is_free: number;
        duration_hours: number;
      },
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-white">{t.coursesTitle}</h1>
        <p className="mt-2 text-mist">{t.coursesSub}</p>
      </div>

      <form className="flex flex-col gap-3 md:flex-row" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder={t.searchPlaceholder}
          className="input md:flex-1"
        />
        <select name="category" defaultValue={category} className="input md:w-56">
          <option value="">{t.allCategories}</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category}
            </option>
          ))}
        </select>
        <button className="btn-primary" type="submit">
          Search
        </button>
      </form>

      {courses.length === 0 ? (
        <div className="surface p-10 text-center text-mist">{t.emptyCourses}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.slug} locale={locale} t={t} course={course} />
          ))}
        </div>
      )}

      <div className="surface p-5 text-sm text-mist">
        {t.subscribeNote}{" "}
        <Link href={`/${locale}/pricing`} className="text-signal">
          {t.ctaPricing}
        </Link>
      </div>
    </div>
  );
}
