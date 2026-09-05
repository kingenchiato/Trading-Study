/**
 * Upserts the super administrator account from env credentials.
 * Run: node scripts/upsert-admin.mjs
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    const val = trimmed.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD || "";
const name = process.env.ADMIN_NAME || "Sガンダム";

if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  process.exit(1);
}

const dbPath = path.join(process.cwd(), "data", "nexora.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const hash = await bcrypt.hash(password, 12);
const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);

if (existing) {
  db.prepare(
    `UPDATE users SET password_hash = ?, name = ?, role = 'admin', avatar_url = '/admin-avatar.png?v=sgundam' WHERE email = ?`,
  ).run(hash, name, email);
  console.log(`Updated admin: ${email}`);
} else {
  const id = `usr_${randomBytes(12).toString("hex")}`;
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, locale, avatar_url)
     VALUES (?, ?, ?, ?, 'admin', 'ja', '/admin-avatar.png?v=sgundam')`,
  ).run(id, email, hash, name);
  console.log(`Created admin: ${email}`);
}

// Demote any other admins so only this account remains super admin
db.prepare(`UPDATE users SET role = 'learner' WHERE role = 'admin' AND email != ?`).run(email);

const admin = db.prepare(`SELECT id, email, name, role FROM users WHERE email = ?`).get(email);
console.log(admin);
