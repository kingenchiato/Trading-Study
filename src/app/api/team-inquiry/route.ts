import { NextResponse } from "next/server";
import { z } from "zod";
import { newId } from "@/lib/auth";
import {
  assertSameOrigin,
  clientIp,
  isRateLimited,
  recordAuthEvent,
} from "@/lib/security";

const schema = z.object({
  company: z.string().min(1).max(120),
  contactName: z.string().min(1).max(80),
  email: z.string().email().max(254),
  seats: z.number().int().min(1).max(10000),
  message: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ensureBootstrapped, getDb } = await import("@/lib/db");
  await ensureBootstrapped();

  const ip = clientIp(request);
  if (isRateLimited(ip, "team_inquiry")) {
    recordAuthEvent({ ip, action: "team_inquiry", success: false });
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  getDb()
    .prepare(
      `INSERT INTO team_leads (id, company, contact_name, email, seats, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId("lead_"),
      parsed.data.company.trim(),
      parsed.data.contactName.trim(),
      parsed.data.email.toLowerCase(),
      parsed.data.seats,
      parsed.data.message?.trim() || null,
    );

  recordAuthEvent({ ip, email: parsed.data.email, action: "team_inquiry", success: true });
  return NextResponse.json({ ok: true });
}
