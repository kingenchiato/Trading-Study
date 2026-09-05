"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/i18n/dictionaries";

export function AuthForm({
  mode,
  locale,
  t,
  nextPath,
}: {
  mode: "login" | "register";
  locale: string;
  t: Dictionary;
  nextPath?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      name: String(form.get("name") || ""),
      locale,
    };
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Error");
      return;
    }
    router.push(nextPath || `/${locale}/dashboard`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-4 p-6">
      {mode === "register" && (
        <div>
          <label className="mb-1 block text-xs text-mist-muted">{t.name}</label>
          <input className="input" name="name" required />
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs text-mist-muted">{t.email}</label>
        <input className="input" name="email" type="email" required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-mist-muted">{t.password}</label>
        <input className="input" name="password" type="password" minLength={mode === "register" ? 10 : 8} required autoComplete={mode === "login" ? "current-password" : "new-password"} />
      </div>
      <button className="btn-primary w-full" disabled={loading} type="submit">
        {mode === "login" ? t.submitLogin : t.submitRegister}
      </button>
      {error && <p className="text-sm text-ember-soft">{error}</p>}
    </form>
  );
}
