import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { AppDatabase } from "./db";

function id(prefix = "") {
  return `${prefix}${randomBytes(10).toString("hex")}`;
}

/** Ensure catalog + admin exist (safe to call repeatedly). */
export async function bootstrapDatabase(db: AppDatabase) {
  const adminEmail = (process.env.ADMIN_EMAIL || "kingenchiato@gmail.com").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "qweqweqwe123!@#";
  const adminName = process.env.ADMIN_NAME || "Sガンダム";

  const existingAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail) as
    | { id: string }
    | undefined;

  const hash = await bcrypt.hash(adminPassword, 12);
  let instructorId = existingAdmin?.id;

  if (!instructorId) {
    instructorId = id("usr_");
    try {
      db.prepare(
        `INSERT INTO users (id, email, password_hash, name, role, locale, avatar_url)
         VALUES (?, ?, ?, ?, 'admin', 'ja', '/admin-avatar.png?v=sgundam')`,
      ).run(instructorId, adminEmail, hash, adminName);
    } catch {
      const raced = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail) as
        | { id: string }
        | undefined;
      if (!raced?.id) throw new Error("Failed to create admin user");
      instructorId = raced.id;
      db.prepare(
        `UPDATE users SET name = ?, role = 'admin', avatar_url = '/admin-avatar.png?v=sgundam', password_hash = ? WHERE id = ?`,
      ).run(adminName, hash, instructorId);
    }
  } else {
    db.prepare(
      `UPDATE users SET name = ?, role = 'admin', avatar_url = '/admin-avatar.png?v=sgundam', password_hash = ? WHERE id = ?`,
    ).run(adminName, hash, instructorId);
  }

  db.prepare(`UPDATE users SET role = 'learner' WHERE role = 'admin' AND email != ?`).run(adminEmail);

  const courseCount = (db.prepare("SELECT COUNT(*) as c FROM courses").get() as { c: number }).c;
  if (courseCount > 0) return;

  const demo = db.prepare("SELECT id FROM users WHERE email = ?").get("learner@nexora.jp");
  if (!demo) {
    const learnerHash = await bcrypt.hash("Learner!2026", 12);
    try {
      db.prepare(
        `INSERT INTO users (id, email, password_hash, name, role, locale)
         VALUES (?, ?, ?, ?, 'learner', 'ja')`,
      ).run(id("usr_"), "learner@nexora.jp", learnerHash, "デモ学習者");
    } catch {
      // concurrent bootstrap may already have created the demo learner
    }
  }

  db.prepare("DELETE FROM plans").run();
  const plans = [
    {
      code: "personal",
      name_ja: "Personal",
      name_en: "Personal",
      price: 2980,
      interval: "month",
      features_ja: JSON.stringify(["全カタログ見放題", "進捗トラッキング", "月次ライブ1回招待", "認定証発行"]),
      features_en: JSON.stringify(["Full catalog access", "Progress tracking", "1 live invite / month", "Certificates"]),
      seats: 1,
    },
    {
      code: "pro",
      name_ja: "Pro",
      name_en: "Pro",
      price: 6980,
      interval: "month",
      features_ja: JSON.stringify(["Personalのすべて", "優先ライブ予約", "キャリアレビュー月1回", "チーム招待（最大3名）"]),
      features_en: JSON.stringify(["Everything in Personal", "Priority live booking", "Monthly career review", "Invite up to 3 teammates"]),
      seats: 3,
    },
    {
      code: "team",
      name_ja: "Team",
      name_en: "Team",
      price: 19800,
      interval: "month",
      features_ja: JSON.stringify(["10シート込み", "管理者ダッシュボード", "カスタム研修パス", "請求書払い相談可"]),
      features_en: JSON.stringify(["10 seats included", "Admin dashboard", "Custom learning paths", "Invoice billing available"]),
      seats: 10,
    },
  ];
  for (const p of plans) {
    db.prepare(
      `INSERT INTO plans (id, code, name_ja, name_en, price_jpy, interval, features_ja, features_en, seat_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id("pln_"), p.code, p.name_ja, p.name_en, p.price, p.interval, p.features_ja, p.features_en, p.seats);
  }

  const courses = [
    {
      slug: "online-training-foundations",
      title_ja: "オンライン研修設計の基礎",
      title_en: "Online Training Design Foundations",
      summary_ja: "収益と学習成果を同時に設計するオンライン研修の骨格を習得。",
      summary_en: "Build online training that delivers outcomes and revenue together.",
      description_ja: "カリキュラム設計、学習ループ、価格設計、受講継続の仕組みまで。",
      description_en: "Curriculum design, learning loops, pricing, and retention systems.",
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
      description_ja: "プロンプト設計から業務自動化、品質管理、チーム展開まで。",
      description_en: "From prompt design to workflow automation, QA, and team rollout.",
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
      description_ja: "JWTセッション、課金Webhook、権限設計など必須の運用知識。",
      description_en: "JWT sessions, billing webhooks, and authorization design.",
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
        `## ${ja}\n\nこのレッスンでは、実務ですぐ使えるチェックリストとワークを通じて理解を定着させます。`,
        `## ${en}\n\nThis lesson locks in understanding through checklists and applied drills.`,
        12 + index * 3,
        index === 0 ? 1 : 0,
      );
    });
  }

  const starts = new Date();
  starts.setDate(starts.getDate() + 10);
  starts.setHours(19, 0, 0, 0);
  db.prepare(
    `INSERT INTO live_sessions (
      id, slug, title_ja, title_en, summary_ja, summary_en, starts_at, duration_min, price_jpy, capacity, meeting_url, instructor_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 90, ?, 30, ?, ?)`,
  ).run(
    id("liv_"),
    "live-ai-ops-sprint",
    "AI業務導入スプリント（ライブ）",
    "AI Ops Adoption Sprint (Live)",
    "90分で業務自動化の初稿を完成させる実践ライブ。",
    "A 90-minute live workshop to ship a first automation draft.",
    starts.toISOString(),
    6800,
    "https://meet.nexora.jp/room/live-ai-ops-sprint",
    instructorId,
  );
}
