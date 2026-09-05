"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/lib/locale";

export function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: Locale) {
    if (!pathname) return;
    const parts = pathname.split("/");
    parts[1] = next;
    router.push(parts.join("/") || `/${next}`);
  }

  return (
    <div className="flex rounded-lg border border-white/10 bg-ink-900 p-0.5 text-xs">
      {(["ja", "en"] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          className={`rounded-md px-2.5 py-1.5 uppercase tracking-wider transition ${
            locale === l ? "bg-signal text-ink-950" : "text-mist hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
