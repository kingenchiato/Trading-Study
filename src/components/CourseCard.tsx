import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/lib/locale";
import { formatYen } from "@/lib/access";

export function CourseCard({
  locale,
  t,
  course,
}: {
  locale: Locale;
  t: Dictionary;
  course: {
    slug: string;
    title: string;
    summary: string;
    category: string;
    level: string;
    price_jpy: number;
    is_free: number;
    duration_hours: number;
  };
}) {
  return (
    <Link
      href={`/${locale}/courses/${course.slug}`}
      className="surface group relative overflow-hidden p-5 transition hover:border-signal/40 hover:shadow-signal"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal/60 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="badge">{course.category}</span>
        <span className="text-xs text-mist-muted">
          {t.level}: {course.level}
        </span>
      </div>
      <h3 className="font-display text-lg text-white group-hover:text-signal-glow">{course.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-mist">{course.summary}</p>
      <div className="mt-5 flex items-end justify-between">
        <div className="text-xs text-mist-muted">
          {course.duration_hours} {t.hours}
        </div>
        <div className="font-display text-lg text-signal">
          {course.is_free ? t.free : formatYen(course.price_jpy, locale)}
        </div>
      </div>
    </Link>
  );
}
