import type { Product } from "@calwise/food-database";
import { Effect } from "effect";
import { Hono } from "hono";
import { FoodService, searchExpression } from "./food-service.ts";

export interface FoodEnv {
  Bindings: { readonly run: <A, E>(effect: Effect.Effect<A, E, FoodService>) => Promise<A> };
}

const attribution = {
  name: "Open Food Facts contributors",
  url: "https://world.openfoodfacts.org",
  license: "ODbL-1.0",
};
// Internal search columns and SQLite row IDs are not part of the API contract.
const publicProduct = ({
  id: _id,
  searchName: _name,
  searchBrands: _brands,
  ...product
}: Product) => product;

export const app = new Hono<FoodEnv>();
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/foods/search", async (c) => {
  const query = (c.req.query("q") ?? "").trim();
  const rawLimit = c.req.query("limit") ?? "20";
  if (query.length < 2 || query.length > 100 || !searchExpression(query)) {
    return c.json({ error: "q must contain searchable text and be 2–100 characters" }, 400);
  }
  if (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 50) {
    return c.json({ error: "limit must be an integer from 1 to 50" }, 400);
  }
  const products = await c.env.run(
    Effect.flatMap(FoodService, (service) => service.search(query, Number(rawLimit))),
  );
  return c.json({ products: products.map(publicProduct), attribution });
});
app.get("/foods/barcode/:barcode", async (c) => {
  const barcode = c.req.param("barcode");
  if (!/^\d{4,24}$/.test(barcode)) return c.json({ error: "invalid barcode" }, 400);
  const product = await c.env.run(
    Effect.flatMap(FoodService, (service) => service.barcode(barcode)),
  );
  if (!product) return c.json({ error: "food not found" }, 404);
  return c.json({ product: publicProduct(product), attribution });
});
app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "internal server error" }, 500);
});
