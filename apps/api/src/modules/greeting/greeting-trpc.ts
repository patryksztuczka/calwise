import { publicProcedure, router, runTrpc } from "../../http/trpc.ts";
import { GreetingService } from "./greeting-service.ts";

export const greetingRouter = router({
  current: publicProcedure.query(({ ctx }) => runTrpc(ctx, GreetingService.current)),
});
