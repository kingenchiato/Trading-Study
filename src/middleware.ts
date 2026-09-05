import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale, locales } from "@/lib/locale";
import { securityHeaders } from "@/lib/security-headers";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block common probe paths early
  if (
    pathname.startsWith("/.env") ||
    pathname.startsWith("/wp-") ||
    pathname.includes("phpmyadmin") ||
    pathname.endsWith(".php")
  ) {
    return new NextResponse(null, { status: 404, headers: securityHeaders() });
  }

  let response: NextResponse;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    response = NextResponse.next();
  } else {
    const segment = pathname.split("/")[1];
    if (!isLocale(segment)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
      response = NextResponse.redirect(url);
    } else {
      response = NextResponse.next();
    }
  }

  const headers = securityHeaders();
  for (const [k, v] of Object.entries(headers)) {
    response.headers.set(k, v);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

void locales;
