import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/locale";

export default async function CheckoutCancelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);

  return (
    <div className="surface mx-auto max-w-lg space-y-4 p-8 text-center">
      <h1 className="font-display text-3xl text-white">{t.checkoutCancel}</h1>
      <Link href={`/${locale}/pricing`} className="btn-ghost inline-flex">
        {t.ctaPricing}
      </Link>
    </div>
  );
}
