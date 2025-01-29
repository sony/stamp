"use server";
import { stampHubClient, unwrapOr } from "@/utils/stampHubClient";
import { getSessionUser } from "@/utils/sessionUser";
import { createServerLogger } from "@/logger";
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

export async function deleteResourceNotification(
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
  const auditNotificationId = formData.get("auditNotificationId")?.toString();

  if (!catalogId || !resourceTypeId || !resourceId || !notificationTypeId || !auditNotificationId) {
    logger.warn("Lack of FormData params");
    return { message: "Lack of FormData params", isSuccess: false };
  }
  const notificationType = await getNotificationType(notificationTypeId);
  if (!notificationType) {
    logger.warn("Notification type not found");
    return { message: "Notification type not found", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.resource.deleteAuditNotification.mutate({
      requestUserId: sessionUser.stampUserId,
      catalogId: catalogId,
      resourceTypeId: resourceTypeId,
      resourceId: resourceId,
      auditNotificationId: auditNotificationId,
    });
    return { message: "Successfully deleted audit notification", isSuccess: true };
  } catch (e) {
    logger.warn("Failed to delete notification channel", e);
    return { message: "Failed to delete notification channel." + (e as Error).message, isSuccess: false };
  }
}
