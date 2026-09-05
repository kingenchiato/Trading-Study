"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlanCheckoutButton({
  locale,
  planCode,
  label,
}: {
  locale: string;
  planCode: string;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "plan", referenceId: planCode, mode: "stripe", locale }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/${locale}/login?next=/${locale}/pricing`);
        return;
      }
      if (!res.ok) {
        // fallback local
        const local = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "plan", referenceId: planCode, mode: "local", locale }),
        });
        const localData = await local.json();
        if (!local.ok) throw new Error(localData.error || "Failed");
        router.push(localData.redirect || `/${locale}/dashboard`);
        router.refresh();
        return;
      }
      if (data.url) window.location.href = data.url;
      else {
        router.push(data.redirect || `/${locale}/dashboard`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn-primary w-full" disabled={loading} onClick={onClick}>
      {label}
    </button>
  );
}
