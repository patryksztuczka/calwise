import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

const source = new URL("../packages/database/drizzle/", import.meta.url);
const target = new URL("../packages/database/migrations/", import.meta.url);
await mkdir(target, { recursive: true });
const entries = await readdir(source, { withFileTypes: true });
await Promise.all(
  entries
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => {
      const sql = await readFile(new URL(`${entry.name}/migration.sql`, source), "utf8");
      const destination = new URL(`${entry.name}.sql`, target);
      const existing = await readFile(destination, "utf8").catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return undefined;
        throw error;
      });
      if (existing !== undefined && existing !== sql) {
        throw new Error(`Migration ${entry.name} changed. Create a new migration instead.`);
      }
      if (existing === undefined) await writeFile(destination, sql, { flag: "wx" });
    }),
);
