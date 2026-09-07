import { rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";

await rm(new URL("../apps/api/.wrangler-test/", import.meta.url), { recursive: true, force: true });
const args = [
  "--filter",
  "@calwise/api",
  "exec",
  "wrangler",
  "d1",
  "migrations",
  "apply",
  "DB",
  "--local",
  "--persist-to",
  ".wrangler-test",
];
execFileSync("pnpm", args, { stdio: "inherit" });
// Applying twice verifies that subsequent releases tolerate already-applied migrations.
execFileSync("pnpm", args, { stdio: "inherit" });
