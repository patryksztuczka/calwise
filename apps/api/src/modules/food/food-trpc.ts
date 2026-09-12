import { TRPCError } from "@trpc/server";
import { Schema } from "effect";
import {
  conflictError,
  protectedProcedure,
  publicProcedure,
  router,
  runTrpc,
} from "../../http/trpc.ts";
import type { Product } from "@calwise/database/food-schema";
import { FoodBarcodeInput, FoodSearchInput, FoodService } from "./food-service.ts";
import {
  decodePersonalProductCursor,
  foldPersonalProductText,
  PersonalProductCreateSchema,
  PersonalProductGetSchema,
  PersonalProductListSchema,
  type PersonalProductCursor,
  PersonalProductService,
} from "./personal-product-service.ts";

const attribution = {
  name: "Open Food Facts contributors",
  url: "https://world.openfoodfacts.org",
  license: "ODbL-1.0",
};

const catalogProduct = (product: Product) => ({ ...product, source: "catalog" as const });

export const foodRouter = router({
  search: publicProcedure.input(FoodSearchInput).query(async ({ ctx, input }) => {
    const products = await runTrpc(
      ctx,
      FoodService.use((service) => service.search(input.q, input.limit)),
    );
    return { products: products.map(catalogProduct), attribution };
  }),
  barcode: publicProcedure.input(FoodBarcodeInput).query(async ({ ctx, input }) => {
    if (ctx.session !== null) {
      const userId = ctx.session.user.id;
      const personalProduct = await runTrpc(
        ctx,
        PersonalProductService.use((service) => service.barcode(userId, input.barcode)),
      );
      if (personalProduct)
        return { source: "personal" as const, product: personalProduct, attribution: null };
    }
    const product = await runTrpc(
      ctx,
      FoodService.use((service) => service.barcode(input.barcode)),
    );
    if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "food not found" });
    return { source: "catalog" as const, product: catalogProduct(product), attribution };
  }),
  personalCreate: protectedProcedure
    .input(Schema.toStandardSchemaV1(PersonalProductCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const result = await runTrpc(
        ctx,
        PersonalProductService.use((service) => service.create(ctx.session.user.id, input)),
      );
      if (result.kind === "conflict")
        throw conflictError({
          kind: result.conflict,
          existingProductId: result.existingProductId,
        });
      return { product: result.product, created: result.kind === "created" };
    }),
  personalList: protectedProcedure
    .input(Schema.toStandardSchemaV1(PersonalProductListSchema))
    .query(async ({ ctx, input }) => {
      const normalizedQuery = foldPersonalProductText(input.query ?? "");
      const expectedMode = normalizedQuery === "" ? "browse" : "search";
      let cursor: PersonalProductCursor | undefined;
      if (input.cursor !== undefined) {
        const decoded = decodePersonalProductCursor(input.cursor);
        if (
          decoded === null ||
          decoded.mode !== expectedMode ||
          (decoded.mode === "search" && decoded.query !== normalizedQuery)
        )
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid pagination cursor" });
        cursor = decoded;
      }
      return runTrpc(
        ctx,
        PersonalProductService.use((service) =>
          service.list(ctx.session.user.id, input.query, cursor ?? undefined),
        ),
      );
    }),
  personalGet: protectedProcedure
    .input(Schema.toStandardSchemaV1(PersonalProductGetSchema))
    .query(async ({ ctx, input }) => {
      const product = await runTrpc(
        ctx,
        PersonalProductService.use((service) => service.get(ctx.session.user.id, input.id)),
      );
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });
      return { product };
    }),
});
