export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ja";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function localize<T extends Record<string, unknown>>(
  item: T,
  locale: Locale,
  fields: string[],
) {
  const out: Record<string, unknown> = { ...item };
  for (const field of fields) {
    const ja = item[`${field}_ja`];
    const en = item[`${field}_en`];
    out[field] = locale === "en" ? en ?? ja : ja ?? en;
  }
  return out;
}
