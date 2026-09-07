import { Greeting } from "@calwise/shared";
import { initTRPC } from "@trpc/server";
import { Schema } from "effect";

export interface ApiContext {
  readonly greeting: () => Promise<Greeting>;
}

const t = initTRPC.context<ApiContext>().create({ isDev: false });

export const appRouter = t.router({
  greeting: t.procedure
    .output(Schema.toStandardSchemaV1(Greeting))
    .query(({ ctx }) => ctx.greeting()),
});

export type AppRouter = typeof appRouter;
