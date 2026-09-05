import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword, newId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  assertSameOrigin,
  authDelay,
  clientIp,
  isRateLimited,
  isStrongPassword,
  passwordSchemaMessage,
  recordAuthEvent,
} from "@/lib/security";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(10).max(128),
  name: z.string().min(1).max(80).optional(),
  locale: z.enum(["ja", "en"]).optional(),
});

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = clientIp(request);
  if (isRateLimited(ip, "register")) {
    recordAuthEvent({ ip, action: "register", success: false });
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    await authDelay();
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!isStrongPassword(body.data.password)) {
    return NextResponse.json({ error: passwordSchemaMessage }, { status: 400 });
  }

  const email = body.data.email.toLowerCase().trim();
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  if (adminEmail && email === adminEmail) {
    recordAuthEvent({ ip, email, action: "register", success: false });
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const db = getDb();
  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
  if (existing) {
    recordAuthEvent({ ip, email, action: "register", success: false });
    await authDelay();
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const id = newId("usr_");
  const password_hash = await hashPassword(body.data.password);
  const name = (body.data.name || email.split("@")[0]).slice(0, 80);

  // Role is always learner — never accept role from client
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, locale)
     VALUES (?, ?, ?, ?, 'learner', ?)`,
  ).run(id, email, password_hash, name, body.data.locale || "ja");

  recordAuthEvent({ ip, email, action: "register", success: true });
  await createSession(id);
  return NextResponse.json({ ok: true });
}
