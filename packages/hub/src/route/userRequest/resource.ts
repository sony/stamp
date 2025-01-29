import { publicProcedure, router } from "../../trpc";

import { TRPCError } from "@trpc/server";
import { convertTRPCError } from "../../error";
import { createStampHubLogger } from "../../logger";
import { unwrapOptionOrThrowNotFound, unwrapOrthrowTRPCError } from "../../utils/neverthrow";
import { createAuditNotification } from "../../workflows/resource/createAuditNotification";
import { createResource } from "../../workflows/resource/createResource";
import { deleteAuditNotification } from "../../workflows/resource/deleteAuditNotification";
import { deleteResource } from "../../workflows/resource/deleteResource";
import { getResourceInfo } from "../../workflows/resource/getResourceInfo";
import {
  CreateAuditNotificationInput,
  CreateResourceInput,
  DeleteAuditNotificationInput,
  DeleteResourceInput,
  GetResourceInfoInput,
  ListResourceAuditItemInput,
  ListResourceOutlinesInput,
  UpdateAuditNotificationInput,
  UpdateResourceApproverInput,
  UpdateResourceOwnerInput,
} from "../../workflows/resource/input";
import { listResourceAuditItem } from "../../workflows/resource/listResourceAuditItem";
import { listResourceOutlines } from "../../workflows/resource/listResourceOutlines";
import { updateAuditNotification } from "../../workflows/resource/updateAuditNotification";
import { updateResourceApprover } from "../../workflows/resource/updateResourceApprover";
import { updateResourceOwner } from "../../workflows/resource/updateResourceOwner";

export const resourceRouter = router({
  get: publicProcedure.input(GetResourceInfoInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const getResourceResult = await getResourceInfo({
      getCatalogConfigProvider: ctx.config.catalogConfig.get,
      getResourceDBProvider: ctx.db.resourceDB.getById,
    })(input)
      .andThen(unwrapOptionOrThrowNotFound)
      .mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(getResourceResult);
  }),
  create: publicProcedure.input(CreateResourceInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const createResourceResult = await createResource({
      catalogDBProvider: ctx.db.catalogDB,
      catalogConfigProvider: ctx.config.catalogConfig,
      resourceDBProvider: ctx.db.resourceDB,
      getGroupMemberShip: ctx.identity.groupMemberShip.get,
    })(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(createResourceResult);
  }),
  delete: publicProcedure.input(DeleteResourceInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const createResourceResult = await deleteResource(
      logger,
      ctx.db.catalogDB,
      ctx.config.catalogConfig,
      ctx.db.resourceDB,
      ctx.identity.groupMemberShip.get,
      ctx.config.notificationPlugin.get,
      ctx.scheduler
    )(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(createResourceResult);
  }),
  listOutlines: publicProcedure.input(ListResourceOutlinesInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const listResourceOutlinesResult = await listResourceOutlines({ catalogConfigProvider: ctx.config.catalogConfig })(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(listResourceOutlinesResult);
  }),
  updateApprover: publicProcedure.input(UpdateResourceApproverInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const updateResourceApproverResult = await updateResourceApprover({
      catalogDBProvider: ctx.db.catalogDB,
      catalogConfigProvider: ctx.config.catalogConfig,
      resourceDBProvider: ctx.db.resourceDB,
      getGroupMemberShip: ctx.identity.groupMemberShip.get,
    })(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(updateResourceApproverResult);
  }),
  updateOwner: publicProcedure.input(UpdateResourceOwnerInput).mutation(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const updateResourceOwnerResult = await updateResourceOwner({
      catalogDBProvider: ctx.db.catalogDB,
      catalogConfigProvider: ctx.config.catalogConfig,
      resourceDBProvider: ctx.db.resourceDB,
      getGroupMemberShip: ctx.identity.groupMemberShip.get,
    })(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(updateResourceOwnerResult);
  }),
  listAuditItem: publicProcedure.input(ListResourceAuditItemInput).query(async ({ input, ctx }) => {
    const logger = createStampHubLogger();
    const listResourceAuditItemResult = await listResourceAuditItem(logger, ctx.config.catalogConfig.get)(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(listResourceAuditItemResult);
  }),
  createAuditNotification: publicProcedure.input(CreateAuditNotificationInput).mutation(async ({ input, ctx }) => {
    if (ctx.scheduler === undefined) {
      return new TRPCError({ message: `Scheduler not enabled in Stamp Hub.`, code: "BAD_REQUEST" });
    }
    const logger = createStampHubLogger();
    const result = await createAuditNotification({
      logger: logger,
      getCatalogDBProvider: ctx.db.catalogDB.getById,
      getCatalogConfigProvider: ctx.config.catalogConfig.get,
      getResourceDBProvider: ctx.db.resourceDB.getById,
      createAuditNotificationResourceDBProvider: ctx.db.resourceDB.createAuditNotification,
      getGroupMemberShip: ctx.identity.groupMemberShip.get,
      getUserProvider: ctx.identity.user.get,
      getNotificationPluginConfig: ctx.config.notificationPlugin.get,
      createSchedulerEvent: ctx.scheduler.createSchedulerEvent,
      deleteSchedulerEvent: ctx.scheduler.deleteSchedulerEvent,
    })(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(result);
  }),
  updateAuditNotification: publicProcedure.input(UpdateAuditNotificationInput).mutation(async ({ input, ctx }) => {
    if (ctx.scheduler === undefined) {
      return new TRPCError({ message: `Scheduler not enabled in Stamp Hub.`, code: "BAD_REQUEST" });
    }
    const logger = createStampHubLogger();
    const result = await updateAuditNotification({
      logger: logger,
      getCatalogDBProvider: ctx.db.catalogDB.getById,
      getCatalogConfigProvider: ctx.config.catalogConfig.get,
      getResourceDBProvider: ctx.db.resourceDB.getById,
      updateAuditNotificationResourceDBProvider: ctx.db.resourceDB.updateAuditNotification,
      getGroupMemberShip: ctx.identity.groupMemberShip.get,
      getUserProvider: ctx.identity.user.get,
      getNotificationPluginConfig: ctx.config.notificationPlugin.get,
      updateSchedulerEvent: ctx.scheduler.updateSchedulerEvent,
      getSchedulerEvent: ctx.scheduler.getSchedulerEvent,
    })(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(result);
  }),
  deleteAuditNotification: publicProcedure.input(DeleteAuditNotificationInput).mutation(async ({ input, ctx }) => {
    if (ctx.scheduler === undefined) {
      return new TRPCError({ message: `Scheduler not enabled in Stamp Hub.`, code: "BAD_REQUEST" });
    }
    const logger = createStampHubLogger();
    const result = await deleteAuditNotification({
      logger: logger,
      getCatalogDBProvider: ctx.db.catalogDB.getById,
      getCatalogConfigProvider: ctx.config.catalogConfig.get,
      getResourceDBProvider: ctx.db.resourceDB.getById,
      deleteAuditNotificationResourceDBProvider: ctx.db.resourceDB.deleteAuditNotification,
      getGroupMemberShip: ctx.identity.groupMemberShip.get,
      getUserProvider: ctx.identity.user.get,
      getNotificationPluginConfig: ctx.config.notificationPlugin.get,
      deleteSchedulerEvent: ctx.scheduler.deleteSchedulerEvent,
      getSchedulerEvent: ctx.scheduler.getSchedulerEvent,
    })(input).mapErr(convertTRPCError(logger));
    return unwrapOrthrowTRPCError(result);
  }),
});
