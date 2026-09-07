import { writeFile } from "node:fs/promises";
import config from "../apps/api/wrangler.json" with { type: "json" };

const id = process.env.D1_DATABASE_ID;
if (
  !id ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
  id === "00000000-0000-0000-0000-000000000000"
) {
  throw new Error("Set D1_DATABASE_ID to the database ID created by Terraform.");
}

await writeFile(
  new URL("../apps/api/wrangler.production.json", import.meta.url),
  JSON.stringify(
    {
      ...config,
      d1_databases: config.d1_databases.map((binding) => ({ ...binding, database_id: id })),
    },
    null,
    2,
  ) + "\n",
);
