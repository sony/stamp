import { Logger } from "@stamp-lib/stamp-logger";
import { ListResourceAuditItem, ListResourceAuditItemOutput } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ConfigProvider, GetNotificationPluginConfig } from "@stamp-lib/stamp-types/configInterface";
import { ResourceAuditNotificationProperty, SchedulerEvent } from "@stamp-lib/stamp-types/models";
import { DBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { IdentityProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, errAsync, ok, okAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { createGetResourceInfo } from "../../events/resource/info/get";
import { convertPromiseResultToResultAsync, parseZodObject } from "../../utils/neverthrow";

export interface NotificationEventHandlerContext {
  db: DBProvider;
  config: ConfigProvider;
  identity: IdentityProvider;
  logger: Logger;
}

export type NotificationEventHandler = (schedulerEvent: SchedulerEvent) => ResultAsync<void, StampHubError>;

export const notificationEventHandler =
  (notificationEventHandlerContext: NotificationEventHandlerContext): NotificationEventHandler =>
  (schedulerEvent: SchedulerEvent) => {
    const logger = notificationEventHandlerContext.logger;
    logger.info("Received notification schedulerEvent", schedulerEvent);

    const parsedInputResult = parseZodObject(schedulerEvent.property, ResourceAuditNotificationProperty);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const auditNotification = parsedInputResult.value;

    switch (auditNotification.notificationCategory) {
      case "ResourceAudit":
        return notificationResourceAudit(schedulerEvent.id, auditNotification, notificationEventHandlerContext);

      default:
        logger.error("Invalid notification category", auditNotification.notificationCategory);
        return errAsync(new StampHubError("Notification category is invalid", "Unexpected error occurred", "BAD_REQUEST"));
    }
  };

const notificationResourceAudit = (
  schedulerEventId: string,
  auditNotification: ResourceAuditNotificationProperty,
  notificationEventHandlerContext: NotificationEventHandlerContext
): ResultAsync<void, StampHubError> => {
  const logger = notificationEventHandlerContext.logger;
  const channelProperties = JSON.parse(auditNotification.channelProperties);

  const getCatalogConfig = createGetCatalogConfig(notificationEventHandlerContext.config.catalogConfig.get);
  const getResourceInfo = createGetResourceInfo(notificationEventHandlerContext.db.resourceDB.getById);
  const getNotificationPluginConfig = notificationEventHandlerContext.config.notificationPlugin.get as GetNotificationPluginConfig;

  return getCatalogConfig({
    catalogId: auditNotification.catalogId,
    resourceId: auditNotification.resourceId,
    resourceTypeId: auditNotification.resourceTypeId,
  })
    .andThen(getResourceTypeConfig)
    .andThen((extendInput) => {
      return getResourceInfo(extendInput).andThen((resourceInfo) => {
        if (resourceInfo.isNone()) {
          return errAsync(new StampHubError("Notification resourceType is invalid", "Unexpected error occurred", "BAD_REQUEST"));
        }

        const listResourceAuditItemFunc = extendInput.resourceTypeConfig.handlers.listResourceAuditItem;
        return fetchListResourceAuditItems(logger, listResourceAuditItemFunc)(extendInput.resourceTypeId, extendInput.resourceId)
          .andThen((listResourceResult) => {
            logger.info("listResourceResult", listResourceResult.auditItems);

            return getNotificationPluginConfig(auditNotification.notificationTypeId)
              .andThen((notificationConfig) => {
                if (notificationConfig.isNone()) {
                  logger.error("Request notification Type ID is not found", auditNotification.notificationTypeId);
                  return errAsync(new StampHubError("Request notification Type ID is not found", "Request notification Type ID is not found", "BAD_REQUEST"));
                }

                return okAsync({ notificationConfig: notificationConfig.value });
              })
              .andThen(({ notificationConfig }) => {
                return notificationConfig.handlers.sendNotification({
                  message: {
                    type: auditNotification.notificationCategory,
                    property: {
                      catalogId: auditNotification.catalogId,
                      resourceTypeId: auditNotification.resourceTypeId,
                      resourceId: auditNotification.resourceId,
                      catalogName: extendInput.catalogConfig.name,
                      resourceTypeName: extendInput.resourceTypeConfig.name,
                      resourceName: resourceInfo.value.name,
                      ResourceAuditItem: listResourceResult.auditItems,
                    },
                  },
                  channel: {
                    properties: { channelId: channelProperties["channelId"], customMessage: channelProperties["customMessage"] },
                    id: schedulerEventId,
                    typeId: auditNotification.notificationTypeId,
                  },
                });
              });
          })
          .mapErr(convertStampHubError);
      });
    });
};

const fetchListResourceAuditItems =
  (logger: Logger, listResourceAuditItemFunc: ListResourceAuditItem) =>
  (resourceTypeId: string, resourceId: string, limit?: number, paginationToken?: string): ResultAsync<ListResourceAuditItemOutput, StampHubError> => {
    return convertPromiseResultToResultAsync(logger)(listResourceAuditItemFunc({ resourceTypeId, resourceId, limit, paginationToken })).andThen((result) => {
      if (result.paginationToken) {
        return fetchListResourceAuditItems(logger, listResourceAuditItemFunc)(resourceTypeId, resourceId, limit, result.paginationToken).map((nextResult) => {
          return {
            auditItems: result.auditItems.concat(nextResult.auditItems),
            paginationToken: nextResult.paginationToken,
          };
        });
      }
      return ok(result);
    });
  };
