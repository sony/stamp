import { CatalogId } from "@stamp-lib/stamp-types/models";
import { z } from "zod";
import { publicProcedure, router } from "../../trpc";

import { UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertTRPCError } from "../../error";
import { createCheckCanEditApprovalFlow } from "../../events/approval-flow/authz";
import { createIsCatalogOwner } from "../../events/catalog/ownership/isCatalogOwner";
import { createIsUserInGroup } from "../../events/group/membership";
import { createStampHubLogger } from "../../logger";
import { unwrapOptionOrThrowNotFound, unwrapOrthrowTRPCError } from "../../utils/neverthrow";
import { GetApprovalFlowInput, getApprovalFlow } from "../../workflows/approval-flow/get";
import { listApprovalFlowInfo } from "../../workflows/approval-flow/list";
import { setApprovalFlowInfo } from "../../workflows/approval-flow/set";

export const approvalFlowRouter = router({
  get: publicProcedure.input(GetApprovalFlowInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const getApprovalFlowInfoResult = await getApprovalFlow(ctx.db.approvalFlowDB["getById"], ctx.config.approvalFlow["getInfo"])(input)
      .andThen(unwrapOptionOrThrowNotFound)
      .mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(getApprovalFlowInfoResult);
  }),
  list: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const approvalFlowDBListResult = await listApprovalFlowInfo(
      ctx.db.approvalFlowDB["listByCatalogId"],
      ctx.config.approvalFlow["listInfoByCatalogId"]
    )(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(approvalFlowDBListResult);
  }),
  update: publicProcedure
    .input(
      z.object({
        catalogId: CatalogId,
        approvalFlowId: z.string(),
        approverGroupId: z.string().optional(),
        requestUserId: UserId,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const logger = createStampHubLogger();
      const checkCanEditApprovalFlow = createCheckCanEditApprovalFlow(
        createIsCatalogOwner(ctx.db.catalogDB.getById, createIsUserInGroup(ctx.identity.groupMemberShip.get))
      );

      // authz
      const checkCanEditApprovalFlowResult = await checkCanEditApprovalFlow(input).mapErr(convertTRPCError(logger));
      if (checkCanEditApprovalFlowResult.isErr()) {
        return unwrapOrthrowTRPCError(checkCanEditApprovalFlowResult);
      }

      const approvalFlowDBListResult = await setApprovalFlowInfo(
        ctx.db.approvalFlowDB["set"],
        ctx.config.approvalFlow["getInfo"]
      )(input).mapErr(convertTRPCError(logger));
      return unwrapOrthrowTRPCError(approvalFlowDBListResult);
    }),
});
