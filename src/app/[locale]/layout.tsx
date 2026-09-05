import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getDictionary } from "@/i18n/dictionaries";
import { getSessionUser } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/locale";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  const user = await getSessionUser();

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:48px_48px] opacity-40" />
      <div className="relative">
        <SiteHeader locale={locale} t={t} user={user} />
        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        <SiteFooter locale={locale} t={t} />
      </div>
    </div>
  );
}
