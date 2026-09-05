import Link from "next/link";
import Image from "next/image";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/lib/locale";
import type { User } from "@/lib/db";
import { LanguageSwitch } from "./LanguageSwitch";

export function SiteHeader({
  locale,
  t,
  user,
}: {
  locale: Locale;
  t: Dictionary;
  user: User | null;
}) {
  const base = `/${locale}`;
  const links = [
    { href: `${base}/courses`, label: t.navCourses },
    { href: `${base}/live`, label: t.navLive },
    { href: `${base}/pricing`, label: t.navPricing },
    { href: `${base}/instructor`, label: t.navInstructor },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={base} className="group flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-signal/40 bg-signal/10 font-display text-sm font-bold text-signal shadow-signal">
            NX
          </span>
          <div>
            <div className="font-display text-lg font-semibold tracking-wide text-white">{t.brand}</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-mist-muted">{t.tagline}</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-mist transition hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitch locale={locale} />
          {user ? (
            <>
              <Link href={`${base}/dashboard`} className="btn-ghost hidden sm:inline-flex">
                {t.navDashboard}
              </Link>
              {user.role === "admin" && (
                <Link href={`${base}/admin`} className="btn-ghost hidden sm:inline-flex">
                  {t.navAdmin}
                </Link>
              )}
              <Link href={`${base}/instructor`} className="hidden items-center gap-2 sm:flex">
                <Image
                  src={user.avatar_url || "/admin-avatar.png?v=sgundam"}
                  alt={user.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full border border-signal/40 object-cover"
                />
              </Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="btn-ghost">
                  {t.navLogout}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href={`${base}/login`} className="btn-ghost">
                {t.navLogin}
              </Link>
              <Link href={`${base}/register`} className="btn-primary">
                {t.navRegister}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
