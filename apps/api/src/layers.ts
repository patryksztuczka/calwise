import { DatabaseLive } from "@calwise/database/d1";
import { Layer } from "effect";
import { AuthLive } from "./modules/auth/auth-live.ts";
import type { AuthService } from "./modules/auth/auth-service.ts";
import { GreetingService } from "./modules/greeting/greeting-service.ts";

export const AppLayer = Layer.mergeAll(
  GreetingService.layer.pipe(Layer.provide(DatabaseLive)),
  AuthLive,
);

export type AppServices = GreetingService | AuthService;
