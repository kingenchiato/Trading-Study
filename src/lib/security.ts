import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { getDb } from "./db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 8;
const LOCK_MINUTES = 30;

export function clientIp(request: Request) {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export function ensureSecurityTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_events (
      id TEXT PRIMARY KEY,
      email TEXT,
      ip TEXT NOT NULL,
      action TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_auth_events_ip_created ON auth_events(ip, created_at);
    CREATE INDEX IF NOT EXISTS idx_auth_events_email_created ON auth_events(email, created_at);

    CREATE TABLE IF NOT EXISTS account_locks (
      email TEXT PRIMARY KEY,
      failed_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function eventId() {
  return `evt_${randomBytes(10).toString("hex")}`;
}

export function recordAuthEvent(input: {
  email?: string;
  ip: string;
  action: string;
  success: boolean;
}) {
  ensureSecurityTables();
  getDb()
    .prepare(
      `INSERT INTO auth_events (id, email, ip, action, success) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(eventId(), input.email?.toLowerCase() || null, input.ip, input.action, input.success ? 1 : 0);
}

export function isRateLimited(ip: string, action: string) {
  ensureSecurityTables();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as c FROM auth_events
       WHERE ip = ? AND action = ? AND created_at >= ?`,
    )
    .get(ip, action, since) as { c: number };
  return row.c >= MAX_AUTH_ATTEMPTS;
}

export function getAccountLock(email: string) {
  ensureSecurityTables();
  return getDb()
    .prepare(`SELECT * FROM account_locks WHERE email = ?`)
    .get(email.toLowerCase()) as
    | { email: string; failed_count: number; locked_until: string | null }
    | undefined;
}

export function isAccountLocked(email: string) {
  const lock = getAccountLock(email);
  if (!lock?.locked_until) return false;
  return new Date(lock.locked_until).getTime() > Date.now();
}

export function registerFailedLogin(email: string) {
  ensureSecurityTables();
  const db = getDb();
  const key = email.toLowerCase();
  const current = getAccountLock(key);
  const failed = (current?.failed_count || 0) + 1;
  const lockedUntil =
    failed >= MAX_AUTH_ATTEMPTS
      ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
      : null;

  db.prepare(
    `INSERT INTO account_locks (email, failed_count, locked_until, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(email) DO UPDATE SET
       failed_count = excluded.failed_count,
       locked_until = excluded.locked_until,
       updated_at = datetime('now')`,
  ).run(key, failed, lockedUntil);

  return { failed, lockedUntil };
}

export function clearAccountLock(email: string) {
  ensureSecurityTables();
  getDb().prepare(`DELETE FROM account_locks WHERE email = ?`).run(email.toLowerCase());
}

/** Reject cross-site mutating requests; allow any host the app itself is served on. */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const candidate = origin || referer;
  // Same-origin browser fetch may omit Origin on some navigations; cookies still protect.
  if (!candidate) return true;

  let requestHost: string;
  try {
    requestHost = new URL(candidate).host.toLowerCase();
  } catch {
    return false;
  }

  const allowed = new Set<string>();

  const addHost = (host: string | null | undefined) => {
    if (!host) return;
    const h = host.toLowerCase().split(",")[0]?.trim();
    if (!h) return;
    allowed.add(h);
    // Treat localhost and 127.0.0.1 as equivalent (same port)
    const m = h.match(/^(localhost|127\.0\.0\.1)(:\d+)?$/);
    if (m) {
      const port = m[2] || "";
      allowed.add(`localhost${port}`);
      allowed.add(`127.0.0.1${port}`);
    }
  };

  addHost(request.headers.get("x-forwarded-host"));
  addHost(request.headers.get("host"));

  const app = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    addHost(new URL(app).host);
  } catch {
    addHost("localhost:3000");
  }

  return allowed.has(requestHost);
}

export const passwordSchemaMessage =
  "Password must be at least 10 characters and include upper, lower, number, and symbol.";

export function isStrongPassword(password: string) {
  return (
    password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function applySecurityHeaders(response: Response) {
  const { securityHeaders } = require("./security-headers") as typeof import("./security-headers");
  const headers = securityHeaders();
  for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
  return response;
}

export { securityHeaders } from "./security-headers";

/** Constant-ish delay to reduce timing oracle usefulness on auth failures. */
export async function authDelay() {
  const jitter = 40 + Math.floor(Math.random() * 120);
  await new Promise((r) => setTimeout(r, jitter));
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
