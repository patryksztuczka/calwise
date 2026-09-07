import { DatabaseLive } from "@calwise/database/d1";
import { Layer } from "effect";
import { GreetingService } from "./modules/greeting/greeting-service.ts";

export const AppLayer = GreetingService.layer.pipe(Layer.provide(DatabaseLive));

export type AppServices = GreetingService;
