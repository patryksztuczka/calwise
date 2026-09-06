import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

const migrationsDir = fileURLToPath(new URL("../../../packages/database/drizzle", import.meta.url));

const applyMigrations = async (connectionString: string) => {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const migrations = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .toSorted();
    for (const migration of migrations) {
      // oxlint-disable-next-line no-await-in-loop -- migrations must run in order
      await client.query(readFileSync(join(migrationsDir, migration, "migration.sql"), "utf8"));
    }
  } finally {
    await client.end();
  }
};

let container: StartedPostgreSqlContainer;

export const setup = async () => {
  container = await new PostgreSqlContainer("postgres:18-alpine").start();
  const url = container.getConnectionUri();
  await applyMigrations(url);
  // Read by Config.string("DATABASE_URL") when the app runtime builds its layers.
  process.env.DATABASE_URL = url;
};

export const teardown = async () => {
  await container?.stop();
};
