import { ensureBootstrapped } from "@/lib/db";

/** Runs once when the Node server starts (local / long-running). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await ensureBootstrapped();
  }
}
