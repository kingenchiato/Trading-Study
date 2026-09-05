import { getDb } from "./db";

export function userHasCourseAccess(userId: string, courseId: string) {
  const db = getDb();
  const enrolled = db
    .prepare("SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?")
    .get(userId, courseId);
  if (enrolled) return true;

  const course = db.prepare("SELECT is_free, price_jpy FROM courses WHERE id = ?").get(courseId) as
    | { is_free: number; price_jpy: number }
    | undefined;
  if (!course) return false;
  if (course.is_free) return true;

  const sub = db
    .prepare(
      `SELECT plan_code FROM subscriptions
       WHERE user_id = ? AND status = 'active'
       AND (current_period_end IS NULL OR current_period_end > datetime('now'))
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId) as { plan_code: string } | undefined;

  if (!sub) return false;
  // Personal / Pro / Team unlock paid catalog
  return ["personal", "pro", "team", "personal_year", "pro_year"].includes(sub.plan_code);
}

export function courseProgress(userId: string, courseId: string) {
  const db = getDb();
  const total = db
    .prepare("SELECT COUNT(*) as c FROM lessons WHERE course_id = ?")
    .get(courseId) as { c: number };
  const done = db
    .prepare(
      `SELECT COUNT(*) as c FROM lesson_progress lp
       JOIN lessons l ON l.id = lp.lesson_id
       WHERE lp.user_id = ? AND l.course_id = ?`,
    )
    .get(userId, courseId) as { c: number };
  const pct = total.c === 0 ? 0 : Math.round((done.c / total.c) * 100);
  return { total: total.c, done: done.c, pct };
}

export function formatYen(amount: number, locale: "ja" | "en") {
  return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}
