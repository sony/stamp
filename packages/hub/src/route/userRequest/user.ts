import { publicProcedure, router } from "../../trpc";
import { convertTRPCError } from "../../error";
import { createStampHubLogger } from "../../logger";
import { deleteUser } from "../../workflows/user/userRequest/deleteUser";
import { DeleteUserInput } from "../../workflows/user/userRequest/input";
import { checkCanEditUser } from "../../events/user/authz";
import { isAdmin } from "../../events/admin/isAdmin";
import { unwrapOrthrowTRPCError } from "../../utils/neverthrow";

export const userRouter = router({
  delete: publicProcedure.input(DeleteUserInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    logger.info("Received delete user request", { userId: input.userId, requestUserId: input.requestUserId });

    const deleteUserResult = await deleteUser(
      checkCanEditUser(isAdmin(ctx.identity.user.get)),
      ctx.identity.user.delete,
      ctx.identity.groupMemberShip.listByUser
    )(input).mapErr(convertTRPCError(logger));

    return unwrapOrthrowTRPCError(deleteUserResult);
  }),
});
