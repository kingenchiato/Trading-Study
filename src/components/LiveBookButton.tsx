"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LiveBookButton({
  locale,
  sessionId,
  label,
  disabled,
}: {
  locale: string;
  sessionId: string;
  label: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "live", referenceId: sessionId, mode: "local", locale }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/${locale}/login?next=/${locale}/live`);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.url) window.location.href = data.url;
      else {
        router.push(data.redirect || `/${locale}/live`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn-primary" disabled={disabled || loading} onClick={onClick}>
      {label}
    </button>
  );
}
