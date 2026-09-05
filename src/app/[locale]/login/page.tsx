import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/locale";
import { AuthForm } from "@/components/AuthForm";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-3xl text-white">{t.loginTitle}</h1>
      <AuthForm mode="login" locale={locale} t={t} nextPath={next} />
      <p className="text-sm text-mist">
        {t.noAccount}{" "}
        <Link href={`/${locale}/register`} className="text-signal">
          {t.navRegister}
        </Link>
      </p>
    </div>
  );
}
