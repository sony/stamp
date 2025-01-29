import { router, publicProcedure } from "../../trpc";
import { createStampHubLogger } from "../../logger";
import { convertTRPCError } from "../../error";
import { NotificationType } from "@stamp-lib/stamp-types/models";
import { z } from "zod";
import { unwrapOptionOrThrowNotFound, unwrapOrthrowTRPCError } from "../../utils/neverthrow";

export const notificationRouter = router({
  getNotificationType: publicProcedure
    .input(
      z.object({
        id: NotificationType.shape.id,
      })
    )
    .query(async ({ input, ctx }) => {
      const logger = createStampHubLogger();
      const notificationType = await ctx.config.notificationPlugin.get(input.id).andThen(unwrapOptionOrThrowNotFound).mapErr(convertTRPCError(logger));
      return unwrapOrthrowTRPCError(notificationType);
    }),
  listNotificationTypes: publicProcedure.query(async ({ ctx }) => {
    const logger = createStampHubLogger();
    const notificationTypes = await ctx.config.notificationPlugin.list().map(z.array(NotificationType).parse).mapErr(convertTRPCError(logger));

    return unwrapOrthrowTRPCError(notificationTypes);
  }),
});
