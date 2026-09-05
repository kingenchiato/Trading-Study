import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "nexora.db");

const globalForDb = globalThis as unknown as { __nexoraDb?: Database.Database };

function createDb() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'learner' CHECK(role IN ('learner','instructor','admin')),
      locale TEXT NOT NULL DEFAULT 'ja',
      avatar_url TEXT,
      stripe_customer_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title_ja TEXT NOT NULL,
      title_en TEXT NOT NULL,
      summary_ja TEXT NOT NULL,
      summary_en TEXT NOT NULL,
      description_ja TEXT NOT NULL,
      description_en TEXT NOT NULL,
      category TEXT NOT NULL,
      level TEXT NOT NULL,
      price_jpy INTEGER NOT NULL,
      is_free INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      thumbnail TEXT,
      duration_hours REAL NOT NULL DEFAULT 1,
      instructor_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL,
      title_ja TEXT NOT NULL,
      title_en TEXT NOT NULL,
      content_ja TEXT NOT NULL,
      content_en TEXT NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 10,
      is_preview INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      source TEXT NOT NULL DEFAULT 'purchase',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS lesson_progress (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name_ja TEXT NOT NULL,
      name_en TEXT NOT NULL,
      price_jpy INTEGER NOT NULL,
      interval TEXT NOT NULL CHECK(interval IN ('month','year','once')),
      features_ja TEXT NOT NULL,
      features_en TEXT NOT NULL,
      seat_limit INTEGER,
      stripe_price_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      stripe_subscription_id TEXT,
      current_period_end TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL,
      reference_id TEXT,
      amount_jpy INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'jpy',
      status TEXT NOT NULL DEFAULT 'pending',
      stripe_session_id TEXT,
      meta_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS live_sessions (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title_ja TEXT NOT NULL,
      title_en TEXT NOT NULL,
      summary_ja TEXT NOT NULL,
      summary_en TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 90,
      price_jpy INTEGER NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 40,
      meeting_url TEXT,
      instructor_id TEXT NOT NULL REFERENCES users(id),
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS live_bookings (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(session_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id),
      course_id TEXT NOT NULL REFERENCES courses(id),
      issued_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_leads (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT NOT NULL,
      seats INTEGER NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function getDb() {
  if (!globalForDb.__nexoraDb) {
    globalForDb.__nexoraDb = createDb();
  }
  return globalForDb.__nexoraDb;
}

export type User = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: "learner" | "instructor" | "admin";
  locale: string;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  created_at: string;
};

export type Course = {
  id: string;
  slug: string;
  title_ja: string;
  title_en: string;
  summary_ja: string;
  summary_en: string;
  description_ja: string;
  description_en: string;
  category: string;
  level: string;
  price_jpy: number;
  is_free: number;
  is_published: number;
  thumbnail: string | null;
  duration_hours: number;
  instructor_id: string;
  created_at: string;
};

export type Lesson = {
  id: string;
  course_id: string;
  sort_order: number;
  title_ja: string;
  title_en: string;
  content_ja: string;
  content_en: string;
  duration_min: number;
  is_preview: number;
};
