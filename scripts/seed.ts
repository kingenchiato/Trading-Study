import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "nexora.db");

if (process.argv.includes("--reset") && fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

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
    instructor_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
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
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'purchase',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, course_id)
  );
  CREATE TABLE IF NOT EXISTS lesson_progress (
    user_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, lesson_id)
  );
  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ja TEXT NOT NULL,
    name_en TEXT NOT NULL,
    price_jpy INTEGER NOT NULL,
    interval TEXT NOT NULL,
    features_ja TEXT NOT NULL,
    features_en TEXT NOT NULL,
    seat_limit INTEGER,
    stripe_price_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    stripe_subscription_id TEXT,
    current_period_end TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
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
    instructor_id TEXT NOT NULL,
    is_published INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS live_bookings (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
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

function id(prefix = "") {
  return `${prefix}${randomBytes(10).toString("hex")}`;
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "kingenchiato@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "qweqweqwe123!@#";
  const adminName = process.env.ADMIN_NAME || "Sガンダム";
  const adminId = id("usr_");
  const hash = await bcrypt.hash(adminPassword, 12);

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail) as
    | { id: string }
    | undefined;

  let instructorId = existing?.id;
  if (!instructorId) {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, locale, avatar_url)
       VALUES (?, ?, ?, ?, 'admin', 'ja', '/admin-avatar.png?v=sgundam')`,
    ).run(adminId, adminEmail, hash, adminName);
    instructorId = adminId;
  } else {
    db.prepare(
      `UPDATE users SET name = ?, role = 'admin', avatar_url = '/admin-avatar.png?v=sgundam', password_hash = ? WHERE id = ?`,
    ).run(adminName, hash, instructorId);
  }

  // Ensure only this account is admin
  db.prepare(`UPDATE users SET role = 'learner' WHERE role = 'admin' AND email != ?`).run(
    adminEmail.toLowerCase(),
  );

  const demoLearner = db.prepare("SELECT id FROM users WHERE email = ?").get("learner@nexora.jp");
  if (!demoLearner) {
    const learnerHash = await bcrypt.hash("Learner!2026", 12);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, locale)
       VALUES (?, ?, ?, ?, 'learner', 'ja')`,
    ).run(id("usr_"), "learner@nexora.jp", learnerHash, "デモ学習者");
  }

  db.prepare("DELETE FROM plans").run();
  const plans = [
    {
      code: "personal",
      name_ja: "Personal",
      name_en: "Personal",
      price: 2980,
      interval: "month",
      features_ja: JSON.stringify([
        "全カタログ見放題",
        "進捗トラッキング",
        "月次ライブ1回招待",
        "認定証発行",
      ]),
      features_en: JSON.stringify([
        "Full catalog access",
        "Progress tracking",
        "1 live invite / month",
        "Certificates",
      ]),
      seats: 1,
    },
    {
      code: "pro",
      name_ja: "Pro",
      name_en: "Pro",
      price: 6980,
      interval: "month",
      features_ja: JSON.stringify([
        "Personalのすべて",
        "優先ライブ予約",
        "キャリアレビュー月1回",
        "チーム招待（最大3名）",
      ]),
      features_en: JSON.stringify([
        "Everything in Personal",
        "Priority live booking",
        "Monthly career review",
        "Invite up to 3 teammates",
      ]),
      seats: 3,
    },
    {
      code: "team",
      name_ja: "Team",
      name_en: "Team",
      price: 19800,
      interval: "month",
      features_ja: JSON.stringify([
        "10シート込み",
        "管理者ダッシュボード",
        "カスタム研修パス",
        "請求書払い相談可",
      ]),
      features_en: JSON.stringify([
        "10 seats included",
        "Admin dashboard",
        "Custom learning paths",
        "Invoice billing available",
      ]),
      seats: 10,
    },
  ];

  for (const p of plans) {
    db.prepare(
      `INSERT INTO plans (id, code, name_ja, name_en, price_jpy, interval, features_ja, features_en, seat_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id("pln_"), p.code, p.name_ja, p.name_en, p.price, p.interval, p.features_ja, p.features_en, p.seats);
  }

  const courseCount = db.prepare("SELECT COUNT(*) as c FROM courses").get() as { c: number };
  if (courseCount.c === 0) {
    const courses = [
      {
        slug: "online-training-foundations",
        title_ja: "オンライン研修設計の基礎",
        title_en: "Online Training Design Foundations",
        summary_ja: "収益と学習成果を同時に設計するオンライン研修の骨格を習得。",
        summary_en: "Build online training that delivers outcomes and revenue together.",
        description_ja:
          "カリキュラム設計、学習ループ、価格設計、受講継続の仕組みまで。日本市場向けの実践フレームを習得します。",
        description_en:
          "Curriculum design, learning loops, pricing, and retention systems for the Japan-first online market.",
        category: "Business",
        level: "Beginner",
        price: 0,
        free: 1,
        hours: 3.5,
        lessons: [
          ["市場と収益モデルを読む", "Reading markets & revenue models"],
          ["学習体験の設計原則", "Learning experience principles"],
          ["価格とパッケージ", "Pricing & packaging"],
          ["継続率を上げる仕組み", "Retention systems"],
        ],
      },
      {
        slug: "ai-skills-for-professionals",
        title_ja: "実務のためのAIスキル実践",
        title_en: "AI Skills for Professionals",
        summary_ja: "生成AIを業務フローに埋め込み、生産性を数値で改善する。",
        summary_en: "Embed generative AI into workflows and measure productivity gains.",
        description_ja:
          "プロンプト設計から業務自動化、品質管理、チーム展開まで。現場で使える実践カリキュラムです。",
        description_en:
          "From prompt design to workflow automation, QA, and team rollout — practical AI for work.",
        category: "AI",
        level: "Intermediate",
        price: 12800,
        free: 0,
        hours: 6,
        lessons: [
          ["業務課題の分解", "Decompose work problems"],
          ["プロンプトと評価ループ", "Prompts & evaluation loops"],
          ["自動化パイプライン", "Automation pipelines"],
          ["チーム導入プレイブック", "Team adoption playbook"],
          ["成果測定と改善", "Measure & iterate"],
        ],
      },
      {
        slug: "secure-web-product-ops",
        title_ja: "セキュアなWebプロダクト運用",
        title_en: "Secure Web Product Operations",
        summary_ja: "認証・決済・データ保護を踏まえた安全なオンラインサービス運用。",
        summary_en: "Operate online products safely across auth, payments, and data protection.",
        description_ja:
          "JWTセッション、課金Webhook、権限設計、監査ログなど、収益サービスに必須の運用知識を体系化。",
        description_en:
          "JWT sessions, billing webhooks, authorization design, and audit trails for revenue products.",
        category: "Engineering",
        level: "Advanced",
        price: 19800,
        free: 0,
        hours: 8,
        lessons: [
          ["脅威モデル入門", "Threat modeling intro"],
          ["認証とセッション", "Auth & sessions"],
          ["決済とWebhook", "Payments & webhooks"],
          ["権限とテナント", "Roles & tenancy"],
          ["インシデント対応", "Incident response"],
        ],
      },
      {
        slug: "facilitating-live-workshops",
        title_ja: "ライブワークショップ運営術",
        title_en: "Facilitating Live Workshops",
        summary_ja: "少人数ライブで高い満足度と継続課金を生む運営スキル。",
        summary_en: "Run high-satisfaction live workshops that support recurring revenue.",
        description_ja:
          "アジェンダ設計、インタラクション、録画活用、アップセル導線までをカバーします。",
        description_en:
          "Agenda design, interaction patterns, recording leverage, and upsell flows.",
        category: "Teaching",
        level: "Intermediate",
        price: 9800,
        free: 0,
        hours: 4.5,
        lessons: [
          ["ライブの価値設計", "Design live value"],
          ["参加を引き出す技法", "Engagement techniques"],
          ["録画とオンデマンド化", "Recording to on-demand"],
          ["収益導線の接続", "Connect monetization"],
        ],
      },
      {
        slug: "bilingual-content-systems",
        title_ja: "日英バイリンガル教材システム",
        title_en: "Bilingual Content Systems",
        summary_ja: "日本語デフォルトで英語展開可能なコンテンツ運用を構築。",
        summary_en: "Operate JA-default content systems that scale cleanly into English.",
        description_ja:
          "翻訳ワークフロー、用語集、UIコピー、SEO、ローカライズ品質管理を実装レベルで学びます。",
        description_en:
          "Translation workflows, glossaries, UI copy, SEO, and localization QA at implementation level.",
        category: "Content",
        level: "Intermediate",
        price: 8600,
        free: 0,
        hours: 5,
        lessons: [
          ["情報設計と用語統一", "IA & terminology"],
          ["翻訳パイプライン", "Translation pipelines"],
          ["UIとSEOの二言語化", "Bilingual UI & SEO"],
          ["品質チェックリスト", "Quality checklists"],
        ],
      },
      {
        slug: "subscription-growth-lab",
        title_ja: "サブスク成長ラボ",
        title_en: "Subscription Growth Lab",
        summary_ja: "解約率・ARPU・LTVを改善する実験と施策の回し方。",
        summary_en: "Run experiments that improve churn, ARPU, and LTV.",
        description_ja:
          "オンボーディング、プラン設計、アップセル、法人転換の実験フレームワークを習得。",
        description_en:
          "Onboarding, plan design, upsell, and B2B conversion experiment frameworks.",
        category: "Growth",
        level: "Advanced",
        price: 15800,
        free: 0,
        hours: 7,
        lessons: [
          ["北の星指標を決める", "Choose north-star metrics"],
          ["オンボーディング実験", "Onboarding experiments"],
          ["プランと値上げ戦略", "Plans & pricing strategy"],
          ["法人転換ファネル", "B2B conversion funnel"],
        ],
      },
    ];

    for (const c of courses) {
      const courseId = id("crs_");
      db.prepare(
        `INSERT INTO courses (
          id, slug, title_ja, title_en, summary_ja, summary_en, description_ja, description_en,
          category, level, price_jpy, is_free, thumbnail, duration_hours, instructor_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        courseId,
        c.slug,
        c.title_ja,
        c.title_en,
        c.summary_ja,
        c.summary_en,
        c.description_ja,
        c.description_en,
        c.category,
        c.level,
        c.price,
        c.free,
        null,
        c.hours,
        instructorId,
      );

      c.lessons.forEach(([ja, en], index) => {
        db.prepare(
          `INSERT INTO lessons (
            id, course_id, sort_order, title_ja, title_en, content_ja, content_en, duration_min, is_preview
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id("lsn_"),
          courseId,
          index + 1,
          ja,
          en,
          `## ${ja}\n\nこのレッスンでは、実務ですぐ使えるチェックリストとワークを通じて理解を定着させます。\n\n1. 概念を短く定義する\n2. 実例で適用する\n3. 自分の案件に転用する\n4. 学びをメモして次へ進む`,
          `## ${en}\n\nThis lesson locks in understanding through checklists and applied drills.\n\n1. Define the concept briefly\n2. Apply it to an example\n3. Map it to your own work\n4. Capture notes and continue`,
          12 + index * 3,
          index === 0 ? 1 : 0,
        );
      });
    }
  }

  const liveCount = db.prepare("SELECT COUNT(*) as c FROM live_sessions").get() as { c: number };
  if (liveCount.c === 0) {
    const sessions = [
      {
        slug: "live-ai-ops-sprint",
        title_ja: "AI業務導入スプリント（ライブ）",
        title_en: "AI Ops Adoption Sprint (Live)",
        summary_ja: "90分で業務自動化の初稿を完成させる実践ライブ。",
        summary_en: "A 90-minute live workshop to ship a first automation draft.",
        days: 10,
        price: 6800,
      },
      {
        slug: "live-pricing-clinic",
        title_ja: "価格設計クリニック",
        title_en: "Pricing Design Clinic",
        summary_ja: "あなたのサービス価格を講師と一緒に見直す少人数セッション。",
        summary_en: "Small-group clinic to refine your service pricing with the instructor.",
        days: 24,
        price: 9800,
      },
    ];
    for (const s of sessions) {
      const starts = new Date();
      starts.setDate(starts.getDate() + s.days);
      starts.setHours(19, 0, 0, 0);
      db.prepare(
        `INSERT INTO live_sessions (
          id, slug, title_ja, title_en, summary_ja, summary_en, starts_at, duration_min, price_jpy, capacity, meeting_url, instructor_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 90, ?, 30, ?, ?)`,
      ).run(
        id("liv_"),
        s.slug,
        s.title_ja,
        s.title_en,
        s.summary_ja,
        s.summary_en,
        starts.toISOString(),
        s.price,
        "https://meet.nexora.jp/room/" + s.slug,
        instructorId,
      );
    }
  }

  console.log("NEXORA database seeded.");
  console.log(`Admin: ${adminEmail}`);
  console.log("Learner demo: learner@nexora.jp / Learner!2026");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
