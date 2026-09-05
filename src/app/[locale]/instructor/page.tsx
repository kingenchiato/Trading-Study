import Image from "next/image";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { getDb } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/locale";

export default async function InstructorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getDictionary(locale);
  const admin = getDb()
    .prepare(`SELECT name, avatar_url, email FROM users WHERE role = 'admin' LIMIT 1`)
    .get() as { name: string; avatar_url: string | null; email: string } | undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="surface overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-signal/20 via-transparent to-ember/20" />
        <div className="-mt-12 px-8 pb-8">
          <Image
            src={admin?.avatar_url || "/admin-avatar.png?v=sgundam"}
            alt={admin?.name || "Sガンダム"}
            width={120}
            height={120}
            className="h-[120px] w-[120px] rounded-3xl border-2 border-signal object-cover shadow-signal"
            priority
          />
          <div className="mt-5 text-xs uppercase tracking-[0.24em] text-signal">{t.trustLine}</div>
          <h1 className="mt-2 font-display text-4xl text-white">{admin?.name || "Sガンダム"}</h1>
          <p className="mt-2 text-mist">NEXORA Founder · Lead Instructor · Japan</p>
          <p className="mt-6 text-base leading-relaxed text-mist">{t.instructorBio}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Courses", "Live", "Certificates"].map((label) => (
              <div key={label} className="rounded-xl border border-white/10 bg-ink-900 p-4 text-center">
                <div className="text-xs text-mist-muted">{label}</div>
                <div className="mt-1 font-display text-xl text-signal">Active</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
