import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/locale";
import { VerifyForm } from "@/components/VerifyForm";
import { getDictionary } from "@/i18n/dictionaries";

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-3xl text-white">{t.verifyCert}</h1>
      <VerifyForm locale={locale} label={t.verifyCert} />
    </div>
  );
}
