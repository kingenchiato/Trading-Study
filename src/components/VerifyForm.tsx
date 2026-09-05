"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VerifyForm({ locale, label }: { locale: string; label: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <form
      className="surface space-y-3 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) router.push(`/${locale}/certificates/${code.trim().toUpperCase()}`);
      }}
    >
      <input
        className="input"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="XXXXXXXXXXXX"
      />
      <button className="btn-primary w-full" type="submit">
        {label}
      </button>
    </form>
  );
}
