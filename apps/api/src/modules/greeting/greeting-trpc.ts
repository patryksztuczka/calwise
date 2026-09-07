import { TRPCError } from "@trpc/server";
import { publicProcedure, router, runTrpc } from "../../http/trpc.ts";
import { GreetingService } from "./greeting-service.ts";

export const greetingRouter = router({
  current: publicProcedure.query(async ({ ctx }) => {
    const greeting = await runTrpc(ctx, GreetingService.current);
    if (!greeting) throw new TRPCError({ code: "NOT_FOUND", message: "greeting not found" });
    return greeting;
  }),
});
