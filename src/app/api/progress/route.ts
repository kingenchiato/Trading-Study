import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { ensureBootstrapped, getDb } from "@/lib/db";
import { userHasCourseAccess } from "@/lib/access";
import { assertSameOrigin } from "@/lib/security";

const schema = z.object({ lessonId: z.string().min(1).max(64) });

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureBootstrapped();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const db = getDb();
  const lesson = db.prepare(`SELECT * FROM lessons WHERE id = ?`).get(parsed.data.lessonId) as
    | { id: string; course_id: string }
    | undefined;
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!userHasCourseAccess(user.id, lesson.course_id)) {
    return NextResponse.json({ error: "No access" }, { status: 403 });
  }

  db.prepare(
    `INSERT OR IGNORE INTO lesson_progress (user_id, lesson_id) VALUES (?, ?)`,
  ).run(user.id, lesson.id);

  return NextResponse.json({ ok: true });
}
