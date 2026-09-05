import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request: Request) {
  await destroySession();
  const referer = request.headers.get("referer");
  const locale = referer?.includes("/en/") ? "en" : "ja";
  return NextResponse.redirect(new URL(`/${locale}`, request.url), 303);
}
