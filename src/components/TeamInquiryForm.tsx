"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

export function TeamInquiryForm({ locale, t }: { locale: string; t: Dictionary }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/team-inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: form.get("company"),
        contactName: form.get("contactName"),
        email: form.get("email"),
        seats: Number(form.get("seats") || 10),
        message: form.get("message"),
        locale,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error");
      return;
    }
    setDone(true);
  }

  if (done) return <p className="text-signal">{t.inquirySent}</p>;

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <input className="input" name="company" required placeholder={t.company} />
      <input className="input" name="contactName" required placeholder={t.name} />
      <input className="input" name="email" type="email" required placeholder={t.email} />
      <input className="input" name="seats" type="number" min={5} defaultValue={10} placeholder={t.seats} />
      <textarea className="input md:col-span-2" name="message" rows={3} placeholder={t.message} />
      <button className="btn-primary md:col-span-2" type="submit">
        {t.sendInquiry}
      </button>
      {error && <p className="text-sm text-ember-soft md:col-span-2">{error}</p>}
    </form>
  );
}
