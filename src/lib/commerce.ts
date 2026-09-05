import { newId } from "./auth";
import { getDb } from "./db";

export function fulfillCoursePurchase(userId: string, courseId: string, orderId: string) {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO enrollments (id, user_id, course_id, source)
     VALUES (?, ?, ?, 'purchase')`,
  ).run(newId("enr_"), userId, courseId);
  db.prepare(`UPDATE orders SET status = 'paid' WHERE id = ?`).run(orderId);
}

export function fulfillSubscription(userId: string, planCode: string, orderId: string, days = 30) {
  const db = getDb();
  const end = new Date();
  end.setDate(end.getDate() + days);
  db.prepare(
    `INSERT INTO subscriptions (id, user_id, plan_code, status, current_period_end)
     VALUES (?, ?, ?, 'active', ?)`,
  ).run(newId("sub_"), userId, planCode, end.toISOString());
  db.prepare(`UPDATE orders SET status = 'paid' WHERE id = ?`).run(orderId);

  // Grant enrollments to all published paid + free courses for catalog access tracking
  const courses = db.prepare("SELECT id FROM courses WHERE is_published = 1").all() as { id: string }[];
  const insert = db.prepare(
    `INSERT OR IGNORE INTO enrollments (id, user_id, course_id, source) VALUES (?, ?, ?, 'subscription')`,
  );
  for (const c of courses) insert.run(newId("enr_"), userId, c.id);
}

export function fulfillLiveBooking(userId: string, sessionId: string, orderId: string) {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO live_bookings (id, session_id, user_id, status)
     VALUES (?, ?, ?, 'confirmed')`,
  ).run(newId("bok_"), sessionId, userId);
  db.prepare(`UPDATE orders SET status = 'paid' WHERE id = ?`).run(orderId);
}

export function createPendingOrder(input: {
  userId: string;
  kind: string;
  referenceId: string;
  amount: number;
  meta?: Record<string, unknown>;
}) {
  const db = getDb();
  const orderId = newId("ord_");
  db.prepare(
    `INSERT INTO orders (id, user_id, kind, reference_id, amount_jpy, status, meta_json)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(
    orderId,
    input.userId,
    input.kind,
    input.referenceId,
    input.amount,
    JSON.stringify(input.meta ?? {}),
  );
  return orderId;
}
