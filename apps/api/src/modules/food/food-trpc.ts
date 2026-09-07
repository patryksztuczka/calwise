import { TRPCError } from "@trpc/server";
import { publicProcedure, router, runTrpc } from "../../http/trpc.ts";
import { FoodBarcodeInput, FoodSearchInput, FoodService } from "./food-service.ts";

const attribution = {
  name: "Open Food Facts contributors",
  url: "https://world.openfoodfacts.org",
  license: "ODbL-1.0",
};

export const foodRouter = router({
  search: publicProcedure.input(FoodSearchInput).query(async ({ ctx, input }) => {
    const products = await runTrpc(
      ctx,
      FoodService.use((service) => service.search(input.q, input.limit)),
    );
    return { products, attribution };
  }),
  barcode: publicProcedure.input(FoodBarcodeInput).query(async ({ ctx, input }) => {
    const product = await runTrpc(
      ctx,
      FoodService.use((service) => service.barcode(input.barcode)),
    );
    if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "food not found" });
    return { product, attribution };
  }),
});
