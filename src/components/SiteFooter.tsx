import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/lib/locale";

export function SiteFooter({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <footer className="mt-24 border-t border-white/10 bg-ink-900/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/admin-avatar.png?v=sgundam"
            alt="Sガンダム"
            width={56}
            height={56}
            className="h-14 w-14 rounded-2xl border border-signal/40 object-cover shadow-signal"
          />
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-signal">{t.trustLine}</div>
            <div className="font-display text-xl text-white">Sガンダム</div>
            <div className="text-sm text-mist-muted">NEXORA · Japan</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-mist">
          <Link href={`/${locale}/courses`} className="hover:text-signal">
            {t.navCourses}
          </Link>
          <Link href={`/${locale}/pricing`} className="hover:text-signal">
            {t.navPricing}
          </Link>
          <Link href={`/${locale}/live`} className="hover:text-signal">
            {t.navLive}
          </Link>
          <Link href={`/${locale}/certificates/verify`} className="hover:text-signal">
            {t.verifyCert}
          </Link>
        </div>
        <p className="text-xs text-mist-muted">
          © {new Date().getFullYear()} NEXORA / Sガンダム. {t.footerRights}
        </p>
      </div>
    </footer>
  );
}
