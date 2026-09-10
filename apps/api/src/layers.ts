import { DatabaseLive, FoodDatabaseLive } from "@calwise/database/d1";
import { Layer } from "effect";
import { AuthLive } from "./modules/auth/auth-live.ts";
import type { AuthService } from "./modules/auth/auth-service.ts";
import { FoodService } from "./modules/food/food-service.ts";
import { FoodLogService } from "./modules/food-log/food-log-service.ts";
import { GreetingService } from "./modules/greeting/greeting-service.ts";

import { ProfileService } from "./modules/profile/profile-service.ts";

export const AppLayer = Layer.mergeAll(
  GreetingService.layer.pipe(Layer.provide(DatabaseLive)),
  AuthLive,
  ProfileService.layer.pipe(Layer.provide(DatabaseLive)),
  FoodLogService.layer.pipe(Layer.provide(DatabaseLive)),
  FoodService.layer.pipe(Layer.provide(FoodDatabaseLive)),
);

export type AppServices =
  | GreetingService
  | AuthService
  | FoodService
  | FoodLogService
  | ProfileService;
