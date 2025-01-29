import { router, publicProcedure } from "../../trpc";
import { convertTRPCError } from "../../error";
import { unwrapOrthrowTRPCError } from "../../utils/neverthrow";
import { createStampHubLogger } from "../../logger";
import { schedulerHandler, SchedulerHandlerInput } from "../../workflows/scheduler-handler";

export const schedulerHandlerRouter = router({
  invoke: publicProcedure.input(SchedulerHandlerInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger(ctx.requestContext);
    const getResourceTypeInfoResult = await schedulerHandler({ ...ctx, logger })(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(getResourceTypeInfoResult);
  }),
});
