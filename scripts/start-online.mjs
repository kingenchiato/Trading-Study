/**
 * Production boot: ensure DB + admin, then start Next.js.
 * Used by Render / hosts without Docker.
 */
import { spawnSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "nexora.db");
if (!fs.existsSync(dbPath)) {
  console.log("Seeding database...");
  const seed = spawnSync("npx", ["tsx", "scripts/seed.ts"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (seed.status !== 0) {
    console.warn("Seed exited with", seed.status);
  }
}

const admin = spawnSync("node", ["scripts/upsert-admin.mjs"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});
if (admin.status !== 0) {
  console.warn("Admin upsert exited with", admin.status);
}

const port = process.env.PORT || "3000";
const child = spawn("npx", ["next", "start", "-H", "0.0.0.0", "-p", port], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
