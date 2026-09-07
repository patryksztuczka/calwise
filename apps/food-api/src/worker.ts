import { FoodDatabaseLive } from "@calwise/food-database/d1";
import { Effect, Layer } from "effect";
import { Worker } from "effect-cf";
import { app } from "./app.ts";
import { FoodService } from "./food-service.ts";

const FoodLayer = FoodService.layer.pipe(Layer.provide(FoodDatabaseLive));
export default Worker.make(
  FoodLayer,
  Effect.gen(function* () {
    const request = yield* Worker.NativeRequest;
    const services = yield* Effect.context<FoodService>();
    const run = Effect.runPromiseWith(services);
    return yield* Effect.promise(() => Promise.resolve(app.fetch(request, { run })));
  }),
);
