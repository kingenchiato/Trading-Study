import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { formatYen } from "@/lib/access";
import { ensureBootstrapped } from "@/lib/db";
import { isLocale, localize, type Locale } from "@/lib/locale";
import { PlanCheckoutButton } from "@/components/PlanCheckoutButton";
import { TeamInquiryForm } from "@/components/TeamInquiryForm";

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  const db = await ensureBootstrapped();
  const plans = (
    db.prepare(`SELECT * FROM plans WHERE is_active = 1 ORDER BY price_jpy ASC`).all() as Record<
      string,
      unknown
    >[]
  ).map((p) => {
    const localized = localize(p, locale, ["name", "features"]) as Record<string, unknown>;
    return {
      code: String(localized.code),
      name: String(localized.name),
      price_jpy: Number(localized.price_jpy),
      interval: String(localized.interval),
      features: JSON.parse(String(localized.features || "[]")) as string[],
    };
  });

  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl text-white">{t.pricingTitle}</h1>
        <p className="mt-2 text-mist">{t.pricingSub}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan, idx) => (
          <div
            key={plan.code}
            className={`surface relative p-6 ${idx === 1 ? "border-signal/50 shadow-signal" : ""}`}
          >
            {idx === 1 && (
              <div className="absolute -top-3 right-4 rounded-full bg-signal px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-950">
                Popular
              </div>
            )}
            <div className="text-sm text-mist-muted">{plan.name}</div>
            <div className="mt-2 font-display text-4xl text-white">
              {formatYen(plan.price_jpy, locale)}
              <span className="text-base text-mist-muted">
                {plan.interval === "year" ? t.perYear : t.perMonth}
              </span>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-mist">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-signal">▸</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <PlanCheckoutButton locale={locale} planCode={plan.code} label={t.choosePlan} />
            </div>
          </div>
        ))}
      </div>

      <div className="surface p-8">
        <h2 className="font-display text-2xl text-white">{t.teamCta}</h2>
        <p className="mt-2 text-sm text-mist">
          {locale === "ja"
            ? "10名超の組織向けに、シート追加・請求書払い・カスタム研修パスをご提案します。"
            : "For organizations beyond 10 seats: custom paths, invoicing, and rollout support."}
        </p>
        <div className="mt-6">
          <TeamInquiryForm locale={locale} t={t} />
        </div>
      </div>
    </div>
  );
}
