/**
 * Upserts the super administrator account from env credentials.
 * Run: node scripts/upsert-admin.mjs
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import initSqlJs from "sql.js";

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

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "nexora.db");

const wasmPath = path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const SQL = await initSqlJs({
  wasmBinary: fs.existsSync(wasmPath) ? fs.readFileSync(wasmPath) : undefined,
});

const db = fs.existsSync(dbPath)
  ? new SQL.Database(fs.readFileSync(dbPath))
  : new SQL.Database();

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'learner',
    locale TEXT NOT NULL DEFAULT 'ja',
    avatar_url TEXT,
    stripe_customer_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const hash = await bcrypt.hash(password, 12);
const existingStmt = db.prepare("SELECT id FROM users WHERE email = ?");
existingStmt.bind([email]);
const existing = existingStmt.step() ? existingStmt.getAsObject() : null;
existingStmt.free();

if (existing?.id) {
  db.run(
    `UPDATE users SET password_hash = ?, name = ?, role = 'admin', avatar_url = '/admin-avatar.png?v=sgundam' WHERE email = ?`,
    [hash, name, email],
  );
  console.log(`Updated admin: ${email}`);
} else {
  const id = `usr_${randomBytes(12).toString("hex")}`;
  db.run(
    `INSERT INTO users (id, email, password_hash, name, role, locale, avatar_url)
     VALUES (?, ?, ?, ?, 'admin', 'ja', '/admin-avatar.png?v=sgundam')`,
    [id, email, hash, name],
  );
  console.log(`Created admin: ${email}`);
}

db.run(`UPDATE users SET role = 'learner' WHERE role = 'admin' AND email != ?`, [email]);
fs.writeFileSync(dbPath, Buffer.from(db.export()));

const check = db.prepare("SELECT id, email, name, role FROM users WHERE email = ?");
check.bind([email]);
console.log(check.step() ? check.getAsObject() : null);
check.free();
db.close();
