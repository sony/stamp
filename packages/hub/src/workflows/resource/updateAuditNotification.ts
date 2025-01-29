import { createCheckCanEditResource } from "../../events/resource/authz/canEditResource";
import { UpdateAuditNotificationInput } from "./input";

import { Logger } from "@stamp-lib/stamp-logger";
import { CatalogConfigProvider, GetNotificationPluginConfig } from "@stamp-lib/stamp-types/configInterface";
import { NotificationChannel, ResourceAuditNotificationProperty, ResourceInfo, ResourceOnDB, SchedulerEvent } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider, User, UserProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { NotificationPluginConfig } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { GetSchedulerEvent, SchedulerError, UpdateSchedulerEvent } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { convertStampHubError, StampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { createGetResourceInfo } from "../../events/resource/info/get";
import { parseZodObject } from "../../utils/neverthrow";

export type UpdateAuditNotification = (input: UpdateAuditNotificationInput) => ResultAsync<ResourceOnDB, StampHubError>;

export const updateAuditNotification =
  ({
    logger,
    getCatalogDBProvider,
    getCatalogConfigProvider,
    getResourceDBProvider,
    updateAuditNotificationResourceDBProvider,
    getGroupMemberShip,
    getUserProvider,
    getNotificationPluginConfig,
    updateSchedulerEvent,
    getSchedulerEvent,
  }: {
    logger: Logger;
    getCatalogDBProvider: CatalogDBProvider["getById"];
    getCatalogConfigProvider: CatalogConfigProvider["get"];
    getResourceDBProvider: ResourceDBProvider["getById"];
    updateAuditNotificationResourceDBProvider: ResourceDBProvider["updateAuditNotification"];
    getGroupMemberShip: GroupMemberShipProvider["get"];
    getUserProvider: UserProvider["get"];
    getNotificationPluginConfig: GetNotificationPluginConfig;
    updateSchedulerEvent: UpdateSchedulerEvent;
    getSchedulerEvent: GetSchedulerEvent;
  }): UpdateAuditNotification =>
  (input: UpdateAuditNotificationInput) => {
    const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);
    const checkCanEditResource = createCheckCanEditResource(getCatalogDBProvider, getCatalogConfigProvider, getResourceDBProvider, getGroupMemberShip);
    const getResourceInfo = createGetResourceInfo(getResourceDBProvider);

    const parsedInputResult = parseZodObject(input, UpdateAuditNotificationInput);
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
          }
          return okAsync(resource.value);
        });
      })
      .andThen((resource) => {
        if (!resource.auditNotifications || resource.auditNotifications.length === 0) {
          return errAsync(new StampHubError("Audit Notification is not set", "Audit Notification is not set", "BAD_REQUEST"));
        }
        const updateTargetNotification = resource.auditNotifications.find((notification) => {
          return notification.id === parsedInput.auditNotificationId;
        });

        if (!updateTargetNotification) {
          return errAsync(new StampHubError("Audit Notification is not found", "Audit Notification is not found", "BAD_REQUEST"));
        }
        return getNotificationPluginConfig(updateTargetNotification.notificationChannel.typeId).andThen((notificationConfig) => {
          if (notificationConfig.isNone()) {
            return errAsync(new StampHubError("Request notification Type ID is not found", "Request notification Type ID is not found", "BAD_REQUEST"));
          }
          return okAsync({ resource: resource, notificationConfig: notificationConfig.value, updateTargetNotification });
        });
      })
      .andThen(({ resource, notificationConfig, updateTargetNotification }) => {
        return getUserProvider({ userId: parsedInput.requestUserId }).andThen((user) => {
          if (user.isNone()) {
            return errAsync(new StampHubError("Request user is not found", "Request user is not found", "BAD_REQUEST"));
          }
          return okAsync({
            resource: resource,
            notificationConfig: notificationConfig,
            updateTargetNotification: updateTargetNotification,
            user: user.value,
          });
        });
      })
      .andThen(({ resource, notificationConfig, updateTargetNotification, user }) => {
        return getSchedulerEvent({ id: updateTargetNotification.schedulerEventId })
          .orElse((err) => {
            // in order to prevent the detection of an error throw in "andThen", check "orElse" first.
            logger.error("Failed to get scheduler event", err.message);
            return errAsync(new StampHubError("Failed to get scheduler event", err.message, "INTERNAL_SERVER_ERROR"));
          })
          .andThen((schedulerEvent) => {
            if (schedulerEvent.isNone()) {
              return errAsync(new StampHubError("Scheduler event is not found", "Scheduler event is not found", "BAD_REQUEST"));
            }
            return okAsync({ resource, notificationConfig, updateTargetNotification, user, formerSchedulerEvent: schedulerEvent.value });
          });
      })
      .andThen(({ resource, notificationConfig, updateTargetNotification, user, formerSchedulerEvent }) => {
        return updateScheduler(logger, updateSchedulerEvent)(
          parsedInput,
          resource,
          notificationConfig,
          user,
          updateTargetNotification.schedulerEventId,
          formerSchedulerEvent
        ).andThen(({ schedule, channel }) => {
          return okAsync({
            resource,
            notificationConfig,
            notificationChannel: channel,
            updateTargetNotification,
            formerSchedulerEvent,
            latterSchedulerEvent: schedule,
          });
        });
      })
      .andThen(({ resource, notificationConfig, notificationChannel, updateTargetNotification, formerSchedulerEvent, latterSchedulerEvent }) => {
        const resourceDB = {
          ...resource,
          auditNotificationId: updateTargetNotification.id,
          notificationChannel: notificationChannel,
          schedulerEventId: latterSchedulerEvent.id,
          cronExpression: parsedInput.notificationParam.cronExpression,
        };
        return okAsync({ resource, notificationConfig, notificationChannel, resourceDB, formerSchedulerEvent });
      })
      .andThen(({ resource, notificationConfig, notificationChannel, resourceDB, formerSchedulerEvent }) => {
        return updateAuditNotificationResourceDBProvider(resourceDB)
          .andThen((updateResource) => {
            return okAsync(updateResource);
          })
          .orElse((err) => {
            logger.error("Failed to update resource(auditNotifications) DB", err.message);
            // update resource DB(auditNotifications) failed, scheduler rollback
            return rollBackSchedulerForUpdateAuditNotificationFailed(logger, updateSchedulerEvent)(
              parsedInput,
              formerSchedulerEvent,
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

type UpdateSchedulerOutput = {
  schedule: SchedulerEvent;
  channel: NotificationChannel;
};

const updateScheduler =
  (logger: Logger, updateSchedulerEvent: UpdateSchedulerEvent) =>
  (
    input: UpdateAuditNotificationInput,
    resource: ResourceInfo,
    notificationConfig: NotificationPluginConfig,
    user: User,
    schedulerEventId: string,
    formerSchedulerEvent: SchedulerEvent
  ): ResultAsync<UpdateSchedulerOutput, SchedulerError> => {
    const auditNotification: ResourceAuditNotificationProperty = {
      notificationCategory: "ResourceAudit",
      catalogId: input.catalogId,
      resourceTypeId: input.resourceTypeId,
      resourceId: input.resourceId,
      notificationTypeId: input.notificationParam.typeId,
      channelProperties: JSON.stringify(input.notificationParam.channelProperties),
    };
    return updateSchedulerEvent({
      id: schedulerEventId,
      eventType: "Notification",
      property: auditNotification,
      schedulePattern: {
        type: "cron",
        expression: input.notificationParam.cronExpression,
      },
    }).andThen((schedulerEvent) => {
      const message = `${user.userName}(${user.email}) update audit notification for Catalog: ${resource.catalogId}, ResourceType: ${resource.resourceTypeId}, Resource: ${resource.name}(${resource.id}).\n Cron Expression: ${input.notificationParam.cronExpression}`;
      return notificationConfig.handlers
        .setChannel({ properties: input.notificationParam.channelProperties, message })
        .andThen((notificationChannel) => {
          return okAsync({ schedule: schedulerEvent, channel: notificationChannel });
        })
        .orElse((err) => {
          logger.error("Failed to set channel notification", err.message);
          // set channel notification failed, scheduler rollback
          return rollBackSchedulerForSetChannelFailed(logger, updateSchedulerEvent)(formerSchedulerEvent);
        });
    });
  };

const rollBackSchedulerForSetChannelFailed = (logger: Logger, updateSchedulerEvent: UpdateSchedulerEvent) => (formerSchedulerEvent: SchedulerEvent) => {
  // rollback updated scheduler event
  return updateSchedulerEvent(formerSchedulerEvent).andThen((schedulerEvent) => {
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

const rollBackSchedulerForUpdateAuditNotificationFailed =
  (logger: Logger, updateSchedulerEvent: UpdateSchedulerEvent) =>
  (
    input: UpdateAuditNotificationInput,
    formerSchedulerEvent: SchedulerEvent,
    resource: ResourceInfo,
    notificationConfig: NotificationPluginConfig,
    notificationChannel: NotificationChannel
  ) => {
    return updateSchedulerEvent(formerSchedulerEvent).andThen((schedulerEvent) => {
      // rollback successful
      logger.info("Scheduler rollback due to update resource(auditNotifications) DB failure", schedulerEvent);
      // notify that audit notification has been rolled back due to failed update
      const message = `Update failed, audit notification rolled back for Catalog: ${resource.catalogId}, ResourceType: ${resource.resourceTypeId}, Resource: ${resource.name}(${resource.id}).\n Cron Expression: ${input.notificationParam.cronExpression}`;
      return notificationConfig.handlers.unsetChannel({ id: notificationChannel.id, message }).andThen(() => {
        logger.info("Notify unsetChannel due to update resource(auditNotifications) DB failure");
        return errAsync(
          new StampHubError(
            "Failed to update resource(auditNotifications) DB(rollback successful)",
            "Failed to update resource(auditNotifications) DB(rollback successful)",
            "INTERNAL_SERVER_ERROR"
          )
        );
      });
    });
  };
