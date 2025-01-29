"use server";
import { createServerLogger } from "@/logger";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient, unwrapOr } from "@/utils/stampHubClient";
import { NotificationType } from "@stamp-lib/stamp-types/models";
export type UpdateResourceNotificationState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

async function getNotificationType(id: string) {
  const notificationTypes = await unwrapOr(
    stampHubClient.systemRequest.notification.getNotificationType.query({
      id,
    }),
    undefined
  );
  return notificationTypes;
}

async function getResource(requestUserId: string, resourceId: string, catalogId: string, resourceTypeId: string) {
  const resource = await unwrapOr(
    stampHubClient.userRequest.resource.get.query({
      requestUserId,
      catalogId,
      resourceTypeId,
      resourceId,
    }),
    undefined
  );

  return resource;
}

export async function setResourceNotification(
  prevState: UpdateResourceNotificationState | undefined,
  formData: FormData
): Promise<UpdateResourceNotificationState> {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();
  logger.info("updateResourceNotification", formData.getAll("notificationTypeId"));

  const catalogId = formData.get("catalogId")?.toString();
  const resourceTypeId = formData.get("resourceTypeId")?.toString();
  const resourceId = formData.get("resourceId")?.toString();
  const notificationTypeId = formData.get("notificationTypeId")?.toString();
  const cronExpression = formData.get("cronExpression")?.toString();
  if (!catalogId || !resourceTypeId || !resourceId || !notificationTypeId || !cronExpression) {
    logger.warn("Lack of FormData params");
    return { message: "Lack of FormData params", isSuccess: false };
  }
  const notificationType = await getNotificationType(notificationTypeId);
  if (!notificationType) {
    logger.warn("Notification type not found");
    return { message: "Notification type not found", isSuccess: false };
  }

  let channelConfigPropertyValues;
  try {
    channelConfigPropertyValues = await parseNotificationPropertyValues(formData, notificationType);
  } catch (e) {
    logger.warn("Notification property validation error", e);
    return { message: (e as Error).message, isSuccess: false };
  }

  const auditNotificationId = formData.get("auditNotificationId")?.toString();

  if (auditNotificationId) {
    try {
      // update audit notification if auditNotificationId exists
      await stampHubClient.userRequest.resource.updateAuditNotification.mutate({
        auditNotificationId: auditNotificationId,
        requestUserId: sessionUser.stampUserId,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        notificationParam: {
          typeId: notificationTypeId,
          channelProperties: channelConfigPropertyValues,
          cronExpression: cronExpression,
        },
      });
      return { message: "Successfully updated audit notification", isSuccess: true }; // TODO
    } catch (e) {
      logger.warn("Failed to update audit notification", e);
      return { message: `Failed to update audit notification. ${(e as Error).message}`, isSuccess: false };
    }
  } else {
    try {
      // create audit notification if auditNotificationId does not exist
      await stampHubClient.userRequest.resource.createAuditNotification.mutate({
        requestUserId: sessionUser.stampUserId,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        notificationParam: {
          typeId: notificationTypeId,
          channelProperties: channelConfigPropertyValues,
          cronExpression: cronExpression,
        },
      });
      return { message: "Successfully created audit notification", isSuccess: true }; // TODO
    } catch (e) {
      logger.warn("Failed to create audit notification", e);
      return { message: `Failed to create audit notification. ${(e as Error).message}`, isSuccess: false };
    }
  }
}

class NotificationPropertyValidateError extends Error {
  constructor(errorProperties: string[]) {
    const message = `Notification property validation error: ${errorProperties.join(", ")}`;
    super(message);
    this.name = "NotificationPropertyValidateError";
  }
}

async function parseNotificationPropertyValues(formData: FormData, notificationType: NotificationType) {
  const channelConfigPropertyValues: Record<string, string | number | boolean> = {};
  for (const channelConfigProperty of notificationType.channelConfigProperties) {
    const propertyValue = formData.get(`channelConfigProperty.${channelConfigProperty.id}`);

    if (!propertyValue) {
      if (channelConfigProperty.required) {
        throw new NotificationPropertyValidateError([`Required input: channelConfigProperty.${channelConfigProperty.id}`]);
      } else {
        continue;
      }
    }

    switch (channelConfigProperty.type) {
      case "string": {
        channelConfigPropertyValues[channelConfigProperty.id] = propertyValue.toString();
        break;
      }
      case "number": {
        const numberValue = Number(propertyValue);
        if (isNaN(numberValue)) {
          throw new NotificationPropertyValidateError([`Not number: channelConfigProperty.${channelConfigProperty.id}`]);
        }
        channelConfigPropertyValues[channelConfigProperty.id] = numberValue;
        break;
      }
      case "boolean": {
        channelConfigPropertyValues[channelConfigProperty.id] = propertyValue === "true";
        break;
      }
      default: {
        throw new NotificationPropertyValidateError([`Unsupported type: channelConfigProperty.${channelConfigProperty.type}`]);
      }
    }
  }
  return channelConfigPropertyValues;
}
