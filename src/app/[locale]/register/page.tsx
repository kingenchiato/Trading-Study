import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/locale";
import { AuthForm } from "@/components/AuthForm";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-3xl text-white">{t.registerTitle}</h1>
      <AuthForm mode="register" locale={locale} t={t} />
      <p className="text-sm text-mist">
        {t.hasAccount}{" "}
        <Link href={`/${locale}/login`} className="text-signal">
          {t.navLogin}
        </Link>
      </p>
    </div>
  );
}
