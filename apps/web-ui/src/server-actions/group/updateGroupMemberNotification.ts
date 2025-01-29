"use server";
import { createServerLogger } from "@/logger";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient, unwrapOr } from "@/utils/stampHubClient";
import { NotificationType } from "@stamp-lib/stamp-types/models";

export type UpdateGroupMemberNotificationState = {
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

export async function updateGroupMemberNotificationSubmit(prevState: UpdateGroupMemberNotificationState | undefined, formData: FormData) {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();
  const notificationTypeId = formData.get("notificationTypeId")?.toString();
  const groupId = formData.get("groupId")?.toString();
  const groupMemberNotificationId = formData.get("groupMemberNotificationId")?.toString();

  logger.info("updateGroupMemberNotificationSubmit:sessionUser", sessionUser);
  logger.info("updateGroupMemberNotificationSubmit:notificationTypeId", notificationTypeId);
  logger.info("updateGroupMemberNotificationSubmit:groupId", groupId);
  logger.info("updateGroupMemberNotificationSubmit:groupMemberNotificationId", groupMemberNotificationId);

  if (!notificationTypeId || !groupId) {
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

  logger.info("channelConfigPropertyValues", channelConfigPropertyValues);

  try {
    if (groupMemberNotificationId) {
      // Group member notification exists, update it.
      await stampHubClient.userRequest.group.updateGroupMemberNotification.mutate({
        requestUserId: sessionUser.stampUserId,
        groupId: groupId.toString(),
        notificationId: groupMemberNotificationId,
        notificationChannel: {
          id: channelConfigPropertyValues["channelId"].toString(),
          typeId: notificationTypeId,
          properties: channelConfigPropertyValues,
        },
      });
    } else {
      // Group member notification does not exist, create it.
      await stampHubClient.userRequest.group.createGroupMemberNotification.mutate({
        requestUserId: sessionUser.stampUserId,
        groupId: groupId.toString(),
        notificationChannel: {
          id: channelConfigPropertyValues["channelId"].toString(),
          typeId: notificationTypeId,
          properties: channelConfigPropertyValues,
        },
      });
    }

    return { isSuccess: true, message: "success" };
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
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
