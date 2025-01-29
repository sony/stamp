import { createCheckCanEditResource } from "../../events/resource/authz/canEditResource";
import { CreateAuditNotificationInput } from "./input";

import { Logger } from "@stamp-lib/stamp-logger";
import { CatalogConfigProvider, GetNotificationPluginConfig } from "@stamp-lib/stamp-types/configInterface";
import { NotificationChannel, ResourceAuditNotificationProperty, ResourceInfo, ResourceOnDB, SchedulerEvent } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider, User, UserProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { NotificationPluginConfig } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { CreateSchedulerEvent, DeleteSchedulerEvent, SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { convertStampHubError, StampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { createGetResourceInfo } from "../../events/resource/info/get";
import { parseZodObject } from "../../utils/neverthrow";

export type CreateAuditNotification = (input: CreateAuditNotificationInput) => ResultAsync<ResourceOnDB, StampHubError>;

export const createAuditNotification =
  ({
    logger,
    getCatalogDBProvider,
    getCatalogConfigProvider,
    getResourceDBProvider,
    createAuditNotificationResourceDBProvider,
    getGroupMemberShip,
    getUserProvider,
    getNotificationPluginConfig,
    createSchedulerEvent,
    deleteSchedulerEvent,
  }: {
    logger: Logger;
    getCatalogDBProvider: CatalogDBProvider["getById"];
    getCatalogConfigProvider: CatalogConfigProvider["get"];
    getResourceDBProvider: ResourceDBProvider["getById"];
    createAuditNotificationResourceDBProvider: ResourceDBProvider["createAuditNotification"];
    getGroupMemberShip: GroupMemberShipProvider["get"];
    getUserProvider: UserProvider["get"];
    getNotificationPluginConfig: GetNotificationPluginConfig;
    createSchedulerEvent: CreateSchedulerEvent;
    deleteSchedulerEvent: DeleteSchedulerEvent;
  }): CreateAuditNotification =>
  (input: CreateAuditNotificationInput) => {
    const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);
    const checkCanEditResource = createCheckCanEditResource(getCatalogDBProvider, getCatalogConfigProvider, getResourceDBProvider, getGroupMemberShip);
    const getResourceInfo = createGetResourceInfo(getResourceDBProvider);

    const parsedInputResult = parseZodObject(input, CreateAuditNotificationInput);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const parsedInput = parsedInputResult.value;

    return getCatalogConfig(parsedInput)
      .andThen(checkCanEditResource)
      .andThen(getResourceTypeConfig)
      .andThen((extendInput) => {
        const resourceResult = getResourceInfo({
          catalogId: parsedInput.catalogId,
          resourceId: parsedInput.resourceId,
          resourceTypeId: extendInput.resourceTypeConfig.id,
          resourceTypeConfig: extendInput.resourceTypeConfig,
        });
        return resourceResult.andThen((resource) => {
          logger.info("resource", resource);
          if (resource.isNone()) {
            return errAsync(new StampHubError("Resource not found", "Resource not found", "BAD_REQUEST"));
          } else if (resource.value.auditNotifications && resource.value.auditNotifications.length > 0) {
            // Currently, auditNotifications is limited to 1.
            return errAsync(new StampHubError("Audit Notification already exists", "Audit Notification already exists", "BAD_REQUEST"));
          }
          return okAsync(resource.value);
        });
      })
      .andThen((resource) => {
        return getNotificationPluginConfig(parsedInput.notificationParam.typeId).andThen((notificationConfig) => {
          if (notificationConfig.isNone()) {
            return errAsync(new StampHubError("Request notification Type ID is not found", "Request notification Type ID is not found", "BAD_REQUEST"));
          }
          return okAsync({ resource: resource, notificationConfig: notificationConfig.value });
        });
      })
      .andThen(({ resource, notificationConfig }) => {
        return getUserProvider({ userId: parsedInput.requestUserId }).andThen((user) => {
          if (user.isNone()) {
            return errAsync(new StampHubError("Request user is not found", "Request user is not found", "BAD_REQUEST"));
          }
          return okAsync({ resource: resource, notificationConfig: notificationConfig, user: user.value });
        });
      })
      .andThen(({ resource, notificationConfig, user }) => {
        return createScheduler(logger, createSchedulerEvent, deleteSchedulerEvent)(parsedInput, resource, notificationConfig, user).andThen(
          ({ schedule, channel }) => {
            return okAsync({ resource: resource, notificationConfig: notificationConfig, notificationChannel: channel, latterSchedulerEvent: schedule });
          }
        );
      })
      .andThen(({ resource, notificationConfig, notificationChannel, latterSchedulerEvent }) => {
        const resourceDB = {
          ...resource,
          notificationChannel: notificationChannel,
          schedulerEventId: latterSchedulerEvent.id,
          cronExpression: parsedInput.notificationParam.cronExpression,
        };
        return okAsync({ resource, notificationConfig, notificationChannel, resourceDB, latterSchedulerEvent });
      })
      .andThen(({ resource, notificationConfig, notificationChannel, resourceDB, latterSchedulerEvent }) => {
        return createAuditNotificationResourceDBProvider(resourceDB)
          .andThen((createResource) => {
            return okAsync(createResource);
          })
          .orElse((err) => {
            logger.error("Failed to create resource(auditNotifications) DB", err.message);
            // create resource DB(auditNotifications) failed, scheduler rollback
            return rollBackSchedulerForCreateAuditNotificationFailed(logger, deleteSchedulerEvent)(
              parsedInput,
              latterSchedulerEvent,
              resource,
              notificationConfig,
              notificationChannel
            );
          });
      })
      .mapErr((err) => {
        return convertStampHubError(err, logger);
      });
  };

type CreateSchedulerOutput = {
  schedule: SchedulerEvent;
  channel: NotificationChannel;
};

const createScheduler =
  (logger: Logger, createSchedulerEvent: CreateSchedulerEvent, deleteSchedulerEvent: DeleteSchedulerEvent) =>
  (
    input: CreateAuditNotificationInput,
    resource: ResourceInfo,
    notificationConfig: NotificationPluginConfig,
    user: User
  ): ResultAsync<CreateSchedulerOutput, SchedulerError> => {
    const auditNotification: ResourceAuditNotificationProperty = {
      notificationCategory: "ResourceAudit",
      catalogId: input.catalogId,
      resourceTypeId: input.resourceTypeId,
      resourceId: input.resourceId,
      notificationTypeId: input.notificationParam.typeId,
      channelProperties: JSON.stringify(input.notificationParam.channelProperties),
    };
    return createSchedulerEvent({
      eventType: "Notification",
      property: auditNotification,
      schedulePattern: {
        type: "cron",
        expression: input.notificationParam.cronExpression,
      },
    }).andThen((schedulerEvent) => {
      const message = `${user.userName}(${user.email}) create audit notification for Catalog: ${resource.catalogId}, ResourceType: ${resource.resourceTypeId}, Resource: ${resource.name}(${resource.id}).\n Cron Expression: ${input.notificationParam.cronExpression}`;
      return notificationConfig.handlers
        .setChannel({ properties: input.notificationParam.channelProperties, message })
        .andThen((notificationChannel) => {
          return okAsync({ schedule: schedulerEvent, channel: notificationChannel });
        })
        .orElse((err) => {
          logger.error("Failed to set channel notification", err.message);
          // set channel notification failed, scheduler rollback
          return rollBackSchedulerForSetChannelFailed(logger, deleteSchedulerEvent)(schedulerEvent);
        });
    });
  };

const rollBackSchedulerForSetChannelFailed = (logger: Logger, deleteSchedulerEvent: DeleteSchedulerEvent) => (schedulerEvent: SchedulerEvent) => {
  // delete created scheduler event
  return deleteSchedulerEvent({ id: schedulerEvent.id }).andThen(() => {
    // rollback successful
    logger.info("Scheduler rollback due to set channel notification failure", schedulerEvent);
    return errAsync(
      // no error log output required
      new StampHubError(
        "Failed to set channel notification(rollback successful)",
        "Failed to set channel notification(rollback successful)",
        "INTERNAL_SERVER_ERROR"
      )
    );
  });
};

const rollBackSchedulerForCreateAuditNotificationFailed =
  (logger: Logger, deleteSchedulerEvent: DeleteSchedulerEvent) =>
  (
    input: CreateAuditNotificationInput,
    latterSchedulerEvent: SchedulerEvent,
    resource: ResourceInfo,
    notificationConfig: NotificationPluginConfig,
    notificationChannel: NotificationChannel
  ) => {
    return deleteSchedulerEvent({ id: latterSchedulerEvent.id }).andThen(() => {
      // rollback successful
      logger.info("Scheduler rollback due to create resource(auditNotifications) DB failure");
      // notify that audit notification has been rolled back due to failed creation
      const message = `Create failed, audit notification rolled back for Catalog: ${resource.catalogId}, ResourceType: ${resource.resourceTypeId}, Resource: ${resource.name}(${resource.id}).\n Cron Expression: ${input.notificationParam.cronExpression}`;
      return notificationConfig.handlers.unsetChannel({ id: notificationChannel.id, message }).andThen(() => {
        logger.info("Notify unsetChannel due to create resource(auditNotifications) DB failure");
        return errAsync(
          // no error log output required
          new StampHubError(
            "Failed to create resource(auditNotifications) DB(rollback successful)",
            "Failed to create resource(auditNotifications) DB(rollback successful)",
            "INTERNAL_SERVER_ERROR"
          )
        );
      });
    });
  };
