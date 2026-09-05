import Image from "next/image";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { getDb } from "@/lib/db";
import { isLocale, localize, type Locale } from "@/lib/locale";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale: raw, code } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);

  const row = getDb()
    .prepare(
      `SELECT cert.*, u.name as user_name, c.title_ja, c.title_en
       FROM certificates cert
       JOIN users u ON u.id = cert.user_id
       JOIN courses c ON c.id = cert.course_id
       WHERE cert.code = ?`,
    )
    .get(code.toUpperCase()) as Record<string, unknown> | undefined;

  if (!row) notFound();
  const cert = localize(row, locale, ["title"]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="surface relative overflow-hidden p-10 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(61,255,181,0.15),transparent_55%)]" />
        <div className="relative">
          <div className="text-xs uppercase tracking-[0.3em] text-signal">{t.verifyCert}</div>
          <h1 className="mt-4 font-display text-4xl text-white">NEXORA</h1>
          <p className="mt-6 text-mist">{t.issuedTo}</p>
          <p className="font-display text-3xl text-white">{String(cert.user_name)}</p>
          <p className="mt-6 text-mist">{t.course}</p>
          <p className="font-display text-2xl text-signal-glow">{String(cert.title)}</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Image
              src="/admin-avatar.png?v=sgundam"
              alt="Sガンダム"
              width={48}
              height={48}
              className="h-12 w-12 rounded-full border border-signal/50 object-cover"
            />
            <div className="text-left">
              <div className="text-xs text-mist-muted">{t.trustLine}</div>
              <div className="text-white">Sガンダム</div>
            </div>
          </div>
          <div className="mt-8 grid gap-2 text-sm text-mist-muted sm:grid-cols-2">
            <div>
              {t.issuedAt}: {String(cert.issued_at)}
            </div>
            <div>Code: {String(cert.code)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
