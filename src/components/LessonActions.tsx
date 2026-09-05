"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LessonActions({
  lessonId,
  completed,
  labels,
}: {
  lessonId: string;
  completed: boolean;
  labels: { markComplete: string; completed: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function complete() {
    setLoading(true);
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId }),
    });
    setLoading(false);
    router.refresh();
  }

  if (completed) {
    return <span className="badge text-signal">{labels.completed}</span>;
  }

  return (
    <button className="btn-primary" disabled={loading} onClick={complete}>
      {labels.markComplete}
    </button>
  );
}
