import { router, publicProcedure } from "../../trpc";
import { SubmitWorkflowInput, submitWorkflow } from "../../workflows/approval-request/submit";
import { ApproveWorkflowInput, approveWorkflow } from "../../workflows/approval-request/approve";
import { RejectWorkflowInput, rejectWorkflow } from "../../workflows/approval-request/reject";
import { RevokeWorkflowInput, revokeWorkflow } from "../../workflows/approval-request/revoke";
import {
  ListByApprovalFlowId,
  listByApprovalFlowIdWorkflow,
  ListByRequestUserIdInput,
  listByRequestUserIdWorkflow,
} from "../../workflows/approval-request/list";
import { GetApprovalRequestWorkflow, GetApprovalRequestInput } from "../../workflows/approval-request/get";
import { convertTRPCError } from "../../error";
import { createValidateRequestUserId } from "../../events/user/validation";
import { createStampHubLogger } from "../../logger";

import { unwrapOptionOrThrowNotFound, unwrapOrthrowTRPCError } from "../../utils/neverthrow";

export const approvalRequestRouter = router({
  submit: publicProcedure.input(SubmitWorkflowInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();

    const submitApprovalRequestResult = await submitWorkflow(
      {
        getCatalogConfigProvider: ctx.config.catalogConfig.get,
        setApprovalRequestDBProvider: ctx.db.approvalRequestDB.set,
        getApprovalFlowById: ctx.db.approvalFlowDB.getById,
        getResourceById: ctx.db.resourceDB.getById,
        getGroup: ctx.identity.group.get,
        getNotificationPluginConfig: ctx.config.notificationPlugin.get,
      },
      logger
    )(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(submitApprovalRequestResult);
  }),
  approve: publicProcedure.input(ApproveWorkflowInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const approveApprovalRequestResult = await approveWorkflow({
      getCatalogConfigProvider: ctx.config.catalogConfig.get,
      getApprovalRequestById: ctx.db.approvalRequestDB.getById,
      updateApprovalRequestStatusToApproved: ctx.db.approvalRequestDB.updateStatusToApproved,
      setApprovalRequest: ctx.db.approvalRequestDB.set,
      getApprovalFlowById: ctx.db.approvalFlowDB.getById,
      getResourceById: ctx.db.resourceDB.getById,
      getGroupMemberShip: ctx.identity.groupMemberShip.get,
    })(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(approveApprovalRequestResult);
  }),
  reject: publicProcedure.input(RejectWorkflowInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const rejectApprovalRequestResult = await rejectWorkflow({
      getCatalogConfigProvider: ctx.config.catalogConfig.get,
      getApprovalRequestById: ctx.db.approvalRequestDB.getById,
      updateApprovalRequestStatusToRejected: ctx.db.approvalRequestDB.updateStatusToRejected,
      getApprovalFlowById: ctx.db.approvalFlowDB.getById,
      getResourceById: ctx.db.resourceDB.getById,
      getGroupMemberShip: ctx.identity.groupMemberShip.get,
    })(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(rejectApprovalRequestResult);
  }),
  revoke: publicProcedure.input(RevokeWorkflowInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const revokeApprovalRequestResult = await revokeWorkflow(
      input,
      ctx.config.catalogConfig.get,
      ctx.db.approvalRequestDB,
      ctx.db.approvalFlowDB,
      ctx.db.resourceDB,
      ctx.identity.groupMemberShip
    ).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(revokeApprovalRequestResult);
  }),
  listByApprovalFlowId: publicProcedure.input(ListByApprovalFlowId).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const listByApprovalFlowIdResult = await listByApprovalFlowIdWorkflow(input, ctx.config.catalogConfig.get, ctx.db.approvalRequestDB).mapErr(
      convertTRPCError(logger)
    );
    return unwrapOrthrowTRPCError(listByApprovalFlowIdResult);
  }),
  listByRequestUserId: publicProcedure.input(ListByRequestUserIdInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const validateRequestUserId = createValidateRequestUserId(ctx.identity.user);
    const listByRequestUserIdResult = await listByRequestUserIdWorkflow(
      ctx.db.approvalRequestDB["listByRequestUserId"],
      validateRequestUserId
    )(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(listByRequestUserIdResult);
  }),
  get: publicProcedure.input(GetApprovalRequestInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const getApprovalRequestResult = await GetApprovalRequestWorkflow(input, ctx.db.approvalRequestDB)
      .andThen(unwrapOptionOrThrowNotFound)
      .mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(getApprovalRequestResult);
  }),
});
