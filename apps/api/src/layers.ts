import { DatabaseLive, FoodDatabaseLive } from "@calwise/database/d1";
import { Layer } from "effect";
import { AuthLive } from "./modules/auth/auth-live.ts";
import type { AuthService } from "./modules/auth/auth-service.ts";
import { FoodService } from "./modules/food/food-service.ts";
import { GreetingService } from "./modules/greeting/greeting-service.ts";

export const AppLayer = Layer.mergeAll(
  GreetingService.layer.pipe(Layer.provide(DatabaseLive)),
  AuthLive,
  FoodService.layer.pipe(Layer.provide(FoodDatabaseLive)),
);

export type AppServices = GreetingService | AuthService | FoodService;
