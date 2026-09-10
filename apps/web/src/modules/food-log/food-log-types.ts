import type { inferOutput } from "@trpc/tanstack-react-query";
import type { useTRPC } from "../../lib/trpc";

export type FoodEntry = inferOutput<ReturnType<typeof useTRPC>["foodLog"]["entry"]>;
