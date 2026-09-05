/**
 * Production boot for Render/Docker-style hosts.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const admin = spawn("node", ["scripts/upsert-admin.mjs"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

admin.on("exit", () => {
  const port = process.env.PORT || "3000";
  const child = spawn("npx", ["next", "start", "-H", "0.0.0.0", "-p", port], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
});
