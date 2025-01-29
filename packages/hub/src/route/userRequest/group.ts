import { publicProcedure, router } from "../../trpc";

import { convertTRPCError } from "../../error";
import { unwrapOptionOrThrowNotFound, unwrapOrthrowTRPCError } from "../../utils/neverthrow";

import {
  CreateGroupInput,
  CreateGroupMemberNotificationInput,
  CreateApprovalRequestNotificationInput,
  DeleteGroupInput,
  DeleteGroupMemberNotificationInput,
  DeleteApprovalRequestNotificationInput,
  GetGroupInput,
  ListGroupInput,
  ListGroupMemberShipByGroupInput,
  RemoveUserFromGroupInput,
  UpdateGroupInput,
  UpdateGroupMemberNotificationInput,
  UpdateApprovalRequestNotificationInput,
} from "../../workflows/group/input";

import { createStampHubLogger } from "../../logger";
import {
  addUserToGroup,
  AddUserToGroupInput,
  createGroup,
  createGroupMemberNotification,
  createApprovalRequestNotification,
  deleteGroup,
  deleteGroupMemberNotification,
  deleteApprovalRequestNotification,
  getGroup,
  listGroup,
  listGroupMemberShipByGroup,
  removeUserFromGroup,
  updateGroup,
  updateGroupMemberNotification,
  updateApprovalRequestNotification,
} from "../../workflows/group";

export const groupRouter = router({
  get: publicProcedure.input(GetGroupInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const groupResult = await getGroup(input, ctx.identity.user, ctx.identity.group).andThen(unwrapOptionOrThrowNotFound).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(groupResult);
  }),
  list: publicProcedure.input(ListGroupInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const listGroupResult = await listGroup(input, ctx.identity.user, ctx.identity.group).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(listGroupResult);
  }),
  create: publicProcedure.input(CreateGroupInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const createGroupResult = await createGroup(input, ctx.identity.user, ctx.identity.group, ctx.identity.groupMemberShip).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(createGroupResult);
  }),
  delete: publicProcedure.input(DeleteGroupInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const deleteGroupResult = await deleteGroup(input, ctx.identity.user, ctx.identity.group, ctx.identity.groupMemberShip).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(deleteGroupResult);
  }),
  update: publicProcedure.input(UpdateGroupInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const updateGroupResult = await updateGroup(input, ctx.identity.user, ctx.identity.group, ctx.identity.groupMemberShip).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(updateGroupResult);
  }),
  addUserToGroup: publicProcedure.input(AddUserToGroupInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const addUserToGroupResult = await addUserToGroup(
      logger,
      ctx.identity.user,
      ctx.identity.group,
      ctx.identity.groupMemberShip,
      ctx.config.notificationPlugin.get
    )(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(addUserToGroupResult);
  }),
  removeUserFromGroup: publicProcedure.input(RemoveUserFromGroupInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const removeUserFromGroupResult = await removeUserFromGroup(input, ctx.identity.user, ctx.identity.group, ctx.identity.groupMemberShip).mapErr(
      convertTRPCError(logger)
    );
    return unwrapOrthrowTRPCError(removeUserFromGroupResult);
  }),
  listGroupMemberShipByGroup: publicProcedure.input(ListGroupMemberShipByGroupInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const listGroupMemberShipByGroupResult = await listGroupMemberShipByGroup({
      userProvider: ctx.identity.user,
      groupProvider: ctx.identity.group,
      groupMemberShipProvider: ctx.identity.groupMemberShip,
    })(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(listGroupMemberShipByGroupResult);
  }),
  createGroupMemberNotification: publicProcedure.input(CreateGroupMemberNotificationInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const createGroupMemberNotificationResult = await createGroupMemberNotification(
      logger,
      ctx.identity.user,
      ctx.identity.group,
      ctx.identity.groupMemberShip,
      ctx.config.notificationPlugin.get
    )(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(createGroupMemberNotificationResult);
  }),
  updateGroupMemberNotification: publicProcedure.input(UpdateGroupMemberNotificationInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const updateGroupMemberNotificationResult = await updateGroupMemberNotification(
      logger,
      ctx.identity.user,
      ctx.identity.group,
      ctx.identity.groupMemberShip,
      ctx.config.notificationPlugin.get
    )(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(updateGroupMemberNotificationResult);
  }),
  deleteGroupMemberNotification: publicProcedure.input(DeleteGroupMemberNotificationInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const deleteGroupMemberNotificationResult = await deleteGroupMemberNotification(
      logger,
      ctx.identity.user,
      ctx.identity.group,
      ctx.identity.groupMemberShip,
      ctx.config.notificationPlugin.get
    )(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(deleteGroupMemberNotificationResult);
  }),
  createApprovalRequestNotification: publicProcedure.input(CreateApprovalRequestNotificationInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const createApprovalRequestNotificationResult = await createApprovalRequestNotification(
      logger,
      ctx.identity.user,
      ctx.identity.group,
      ctx.identity.groupMemberShip,
      ctx.config.notificationPlugin.get
    )(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(createApprovalRequestNotificationResult);
  }),
  updateApprovalRequestNotification: publicProcedure.input(UpdateApprovalRequestNotificationInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const updateApprovalRequestNotificationResult = await updateApprovalRequestNotification(
      logger,
      ctx.identity.user,
      ctx.identity.group,
      ctx.identity.groupMemberShip,
      ctx.config.notificationPlugin.get
    )(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(updateApprovalRequestNotificationResult);
  }),
  deleteApprovalRequestNotification: publicProcedure.input(DeleteApprovalRequestNotificationInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const deleteApprovalRequestNotificationResult = await deleteApprovalRequestNotification(
      logger,
      ctx.identity.user,
      ctx.identity.group,
      ctx.identity.groupMemberShip,
      ctx.config.notificationPlugin.get
    )(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(deleteApprovalRequestNotificationResult);
  }),
});
