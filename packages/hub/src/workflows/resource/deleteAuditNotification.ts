import { createCheckCanEditResource } from "../../events/resource/authz/canEditResource";
import { DeleteAuditNotificationInput } from "./input";

import { Logger } from "@stamp-lib/stamp-logger";
import { CatalogConfigProvider, GetNotificationPluginConfig } from "@stamp-lib/stamp-types/configInterface";
import { ResourceOnDB } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider, UserProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { DeleteSchedulerEvent, GetSchedulerEvent } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { convertStampHubError, StampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { createGetResourceInfo } from "../../events/resource/info/get";
import { parseZodObject } from "../../utils/neverthrow";

export type DeleteAuditNotification = (input: DeleteAuditNotificationInput) => ResultAsync<ResourceOnDB, StampHubError>;

export const deleteAuditNotification =
  ({
    logger,
    getCatalogDBProvider,
    getCatalogConfigProvider,
    getResourceDBProvider,
    deleteAuditNotificationResourceDBProvider,
    getGroupMemberShip,
    getUserProvider,
    getNotificationPluginConfig,
    deleteSchedulerEvent,
    getSchedulerEvent,
  }: {
    logger: Logger;
    getCatalogDBProvider: CatalogDBProvider["getById"];
    getCatalogConfigProvider: CatalogConfigProvider["get"];
    getResourceDBProvider: ResourceDBProvider["getById"];
    deleteAuditNotificationResourceDBProvider: ResourceDBProvider["deleteAuditNotification"];
    getGroupMemberShip: GroupMemberShipProvider["get"];
    getUserProvider: UserProvider["get"];
    getNotificationPluginConfig: GetNotificationPluginConfig;
    deleteSchedulerEvent: DeleteSchedulerEvent;
    getSchedulerEvent: GetSchedulerEvent;
  }): DeleteAuditNotification =>
  (input: DeleteAuditNotificationInput) => {
    const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);
    const checkCanEditResource = createCheckCanEditResource(getCatalogDBProvider, getCatalogConfigProvider, getResourceDBProvider, getGroupMemberShip);
    const getResourceInfo = createGetResourceInfo(getResourceDBProvider);

    const parsedInputResult = parseZodObject(input, DeleteAuditNotificationInput);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const parsedInput = parsedInputResult.value;

    return getCatalogConfig(parsedInput)
      .andThen(checkCanEditResource)
      .andThen(getResourceTypeConfig)
      .andThen((extendInput) => {
        const resourceResult = getResourceInfo({
          resourceId: parsedInput.resourceId,
          catalogId: parsedInput.catalogId,
          resourceTypeId: extendInput.resourceTypeConfig.id,
          resourceTypeConfig: extendInput.resourceTypeConfig,
        });
        return resourceResult.andThen((resource) => {
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
        const deleteTargetNotification = resource.auditNotifications.find((notification) => {
          return notification.id === parsedInput.auditNotificationId;
        });

        if (!deleteTargetNotification) {
          return errAsync(new StampHubError("Audit Notification is not found", "Audit Notification is not found", "BAD_REQUEST"));
        }
        return getNotificationPluginConfig(deleteTargetNotification.notificationChannel.typeId).andThen((notificationConfig) => {
          if (notificationConfig.isNone()) {
            // If the notification plugin is not found, we will delete the notification without unsetChannel
            return okAsync({ resource: resource, notificationConfig: undefined, deleteTargetNotification });
          }
          return okAsync({ resource: resource, notificationConfig: notificationConfig.value, deleteTargetNotification });
        });
      })
      .andThen(({ resource, notificationConfig, deleteTargetNotification }) => {
        return getUserProvider({ userId: parsedInput.requestUserId }).andThen((user) => {
          if (user.isNone()) {
            return errAsync(new StampHubError("Request user is not found", "Request user is not found", "BAD_REQUEST"));
          }
          return okAsync({ resource: resource, notificationConfig: notificationConfig, deleteTargetNotification: deleteTargetNotification, user: user.value });
        });
      })
      .andThen(({ resource, notificationConfig, deleteTargetNotification, user }) => {
        if (!notificationConfig) {
          return okAsync({ resource: resource, deleteTargetNotification });
        }
        return getSchedulerEvent({ id: deleteTargetNotification.schedulerEventId })
          .andThen((schedulerEvent) => {
            if (schedulerEvent.isNone()) {
              // Even if not get scheduler event, output error log and continue
              logger.error("Scheduler event is not found", deleteTargetNotification.schedulerEventId);
              return okAsync({ resource: resource, deleteTargetNotification });
            }
            return deleteSchedulerEvent({ id: deleteTargetNotification.schedulerEventId })
              .andThen(() => {
                const message = `${user.userName}(${user.email}) delete audit notification for Catalog: ${resource.catalogId}, ResourceType: ${resource.resourceTypeId}, Resource: ${resource.name}(${resource.id}).`;
                return notificationConfig.handlers
                  .unsetChannel({ id: deleteTargetNotification.notificationChannel.id, message })
                  .andThen(() => {
                    return okAsync({ resource: resource, deleteTargetNotification });
                  })
                  .orElse((err) => {
                    // Even if unsetChannel fails, output error log and continue
                    logger.error("Failed to unset channel notification", err.message);
                    return okAsync({ resource: resource, deleteTargetNotification });
                  });
              })
              .orElse((err) => {
                // Even if deleteSchedulerEvent fails, output error log and continue
                logger.error("Failed to delete scheduler", err.message);
                return okAsync({ resource: resource, deleteTargetNotification });
              });
          })
          .orElse((err) => {
            if (err instanceof StampHubError) {
              // return StampHubError as is
              return errAsync(err);
            } else {
              // Even if getSchedulerEvent fails, output error log and continue
              logger.error("Failed to get scheduler event", err.message);
              return okAsync({ resource: resource, deleteTargetNotification });
            }
          });
      })
      .andThen(({ resource, deleteTargetNotification }) => {
        return deleteAuditNotificationResourceDBProvider({ ...resource, auditNotificationId: deleteTargetNotification.id })
          .andThen((resourceDB) => {
            return okAsync(resourceDB);
          })
          .orElse((err) => {
            logger.error("Failed to delete resource(auditNotifications) DB", err.message);
            return errAsync(new StampHubError("Failed to delete resource(auditNotifications) DB", err.message, "INTERNAL_SERVER_ERROR"));
          });
      })
      .mapErr(convertStampHubError);
  };
