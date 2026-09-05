import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { getDb, type User } from "@/lib/db";
import {
  assertSameOrigin,
  authDelay,
  clearAccountLock,
  clientIp,
  isAccountLocked,
  isRateLimited,
  recordAuthEvent,
  registerFailedLogin,
} from "@/lib/security";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = clientIp(request);
  if (isRateLimited(ip, "login")) {
    recordAuthEvent({ ip, action: "login", success: false, email: undefined });
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    await authDelay();
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = body.data.email.toLowerCase().trim();

  if (isAccountLocked(email)) {
    recordAuthEvent({ ip, email, action: "login", success: false });
    await authDelay();
    return NextResponse.json(
      { error: "Account temporarily locked. Try again later." },
      { status: 423 },
    );
  }

  const user = getDb().prepare(`SELECT * FROM users WHERE email = ?`).get(email) as User | undefined;

  // Equalize timing when user is missing (valid bcrypt of a fixed dummy string)
  const DUMMY_HASH =
    "$2a$12$C6UzMDM.H6dfI/f/IKcEe.OQ5n8n8n8n8n8n8n8n8n8n8n8n8n8n8u";
  let ok = false;
  try {
    ok = user
      ? await verifyPassword(body.data.password, user.password_hash)
      : await verifyPassword(body.data.password, DUMMY_HASH);
  } catch {
    ok = false;
  }

  if (!user || !ok) {
    registerFailedLogin(email);
    recordAuthEvent({ ip, email, action: "login", success: false });
    await authDelay();
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  clearAccountLock(email);
  recordAuthEvent({ ip, email, action: "login", success: true });
  await createSession(user.id);
  return NextResponse.json({ ok: true, role: user.role });
}
