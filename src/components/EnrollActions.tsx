"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EnrollActions({
  locale,
  courseId,
  isFree,
  loggedIn,
  labels,
}: {
  locale: string;
  courseId: string;
  isFree: boolean;
  loggedIn: boolean;
  labels: { enroll: string; login: string; stripePay: string; localPay: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkout(mode: "stripe" | "local") {
    if (!loggedIn) {
      router.push(`/${locale}/login?next=/${locale}/courses`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "course", referenceId: courseId, mode, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
      else router.push(data.redirect || `/${locale}/dashboard`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (isFree) {
    return (
      <button className="btn-primary w-full" disabled={loading} onClick={() => checkout("local")}>
        {labels.enroll}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <button className="btn-primary w-full" disabled={loading} onClick={() => checkout("stripe")}>
        {labels.stripePay}
      </button>
      <button className="btn-ghost w-full" disabled={loading} onClick={() => checkout("local")}>
        {labels.localPay}
      </button>
      {error && <p className="text-xs text-ember-soft">{error}</p>}
      {!loggedIn && <p className="text-xs text-mist-muted">{labels.login}</p>}
    </div>
  );
}
