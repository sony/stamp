import { Logger } from "@stamp-lib/stamp-logger";
import { CatalogConfigProvider, GetNotificationPluginConfig } from "@stamp-lib/stamp-types/configInterface";
import { ResourceInfo } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { SchedulerError, SchedulerProvider } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { convertStampHubError, StampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { createCheckCanEditResource } from "../../events/resource/authz/canEditResource";
import { createGetResourceInfo } from "../../events/resource/info/get";
import { convertPromiseResultToResultAsync, parseZodObject } from "../../utils/neverthrow";
import { DeleteResourceInput } from "./input";

export const deleteResource =
  (
    logger: Logger,
    catalogDBProvider: CatalogDBProvider,
    catalogConfigProvider: CatalogConfigProvider,
    resourceDBProvider: ResourceDBProvider,
    getGroupMemberShip: GroupMemberShipProvider["get"],
    getNotificationPluginConfig: GetNotificationPluginConfig,
    schedulerProvider?: SchedulerProvider
  ) =>
  (input: DeleteResourceInput): ResultAsync<void, StampHubError> => {
    const getCatalogConfig = createGetCatalogConfig(catalogConfigProvider.get);
    const checkCanEditResource = createCheckCanEditResource(
      catalogDBProvider.getById,
      catalogConfigProvider.get,
      resourceDBProvider.getById,
      getGroupMemberShip
    );
    const getResourceInfo = createGetResourceInfo(resourceDBProvider.getById);

    const parsedInputResult = parseZodObject(input, DeleteResourceInput);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const parsedInput = parsedInputResult.value;

    return (
      getCatalogConfig(parsedInput)
        //TODO: validate groupId and UserId
        .andThen(checkCanEditResource)
        .andThen(getResourceTypeConfig)
        .andThen((extendInput) => {
          // Must be obtained before calling deleteResource
          const resourceResult = getResourceInfo({
            resourceId: parsedInput.resourceId,
            catalogId: parsedInput.catalogId,
            resourceTypeId: extendInput.resourceTypeConfig.id,
            resourceTypeConfig: extendInput.resourceTypeConfig,
          });
          return resourceResult.andThen((resource) => {
            if (resource.isNone()) {
              // This is not an error because the item may not be registered in the DB.
              return okAsync({ extendInput: extendInput, resource: undefined });
            }
            return okAsync({ extendInput: extendInput, resource: resource.value });
          });
        })
        .andThen(({ extendInput, resource }) => {
          // Delete all auditNotifications associated with resource
          return deleteAuditNotifications(
            logger,
            schedulerProvider
          )(resource).andThen((resource) => {
            return okAsync({ extendInput, resource });
          });
        })
        .andThen(({ extendInput, resource }) => {
          return convertPromiseResultToResultAsync(logger)(
            extendInput.resourceTypeConfig.handlers.deleteResource({
              resourceTypeId: extendInput.resourceTypeConfig.id,
              resourceId: parsedInput.resourceId,
            })
          ).map(() => resource);
        })
        .andThen((resource) => {
          return resourceDBProvider
            .delete({ id: parsedInput.resourceId, catalogId: parsedInput.catalogId, resourceTypeId: parsedInput.resourceTypeId })
            .andThen(() => {
              return okAsync(resource);
            });
        })
        .andThen((resource) => {
          // Notify unset of all auditNotifications associated with resource
          return unsetAuditNotifications(logger, getNotificationPluginConfig)(resource).map(() => void 0);
        })
        .mapErr((err) => {
          return convertStampHubError(err, logger);
        })
    );
  };

const deleteAuditNotifications =
  (logger: Logger, schedulerProvider?: SchedulerProvider) =>
  (resource: ResourceInfo | undefined): ResultAsync<ResourceInfo | undefined, StampHubError> => {
    if (!resource || !resource.auditNotifications || resource.auditNotifications.length === 0 || !schedulerProvider) {
      return okAsync(undefined);
    }

    logger.info("Delete audit notifications", resource.auditNotifications.length);
    const results = [];
    // Delete all auditNotifications associated with resource (now only one)
    for (const auditNotification of resource.auditNotifications) {
      const notificationResult = schedulerProvider.getSchedulerEvent({ id: auditNotification.schedulerEventId }).andThen((schedulerEvent) => {
        if (schedulerEvent.isNone()) {
          logger.error("Failed to get audit notification", auditNotification.schedulerEventId);
          return errAsync(new SchedulerError("Failed to get audit notification", "Failed to get audit notification"));
        }

        return schedulerProvider.deleteSchedulerEvent({ id: auditNotification.schedulerEventId });
      });

      results.push(notificationResult);
    }

    return ResultAsync.combineWithAllErrors(results)
      .andThen((combinedResults) => {
        logger.info("Number of successes", combinedResults.length);
        if (combinedResults.length === 0) {
          return okAsync(undefined);
        }

        return okAsync(resource);
      })
      .orElse((combinedErrors) => {
        // Even if not delete scheduler event, output error log and continue
        combinedErrors.forEach((err) => {
          logger.error("Failed to delete audit notification", err.message);
        });
        // Returns undefined because channel may not exist
        return okAsync(undefined);
      });
  };

const unsetAuditNotifications =
  (logger: Logger, getNotificationPluginConfig: GetNotificationPluginConfig) =>
  (resource: ResourceInfo | undefined): ResultAsync<void, StampHubError> => {
    if (!resource || !resource.auditNotifications || resource.auditNotifications.length === 0) {
      return okAsync(void 0);
    }

    logger.info("Unset audit notifications", resource.auditNotifications.length);
    const results = [];
    // Notify unset of all auditNotifications associated with resource (now only one)
    for (const auditNotification of resource.auditNotifications) {
      const notificationResult = getNotificationPluginConfig(auditNotification.notificationChannel.typeId)
        .andThen((notificationConfig) => {
          if (notificationConfig.isNone()) {
            return okAsync(undefined);
          }

          return okAsync(notificationConfig.value);
        })
        .andThen((notificationConfig) => {
          if (!notificationConfig) {
            logger.error("Request notification Type ID is not found", auditNotification.notificationChannel.typeId);
            return okAsync(void 0);
          }

          const message = `Resource deleted, also removed audit notification for Catalog: ${resource.catalogId}, ResourceType: ${resource.resourceTypeId}, Resource: ${resource.name}(${resource.id}).`;
          return notificationConfig.handlers.unsetChannel({ id: auditNotification.notificationChannel.id, message });
        });

      results.push(notificationResult);
    }

    return ResultAsync.combineWithAllErrors(results)
      .andThen((combinedResults) => {
        logger.info("Number of successes", combinedResults.length);
        return okAsync(void 0);
      })
      .orElse((combinedErrors) => {
        // Even if unset channel notification failed, output error log and continue
        combinedErrors.forEach((err) => {
          logger.error("Failed to unset channel notification", err.message);
        });
        return okAsync(void 0);
      });
  };
