"use server";
import { createServerLogger } from "@/logger";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";

export type DeleteApprovalRequestNotificationState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function deleteApprovalRequestNotificationSubmit(prevState: DeleteApprovalRequestNotificationState | undefined, formData: FormData) {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();
  const groupId = formData.get("groupId")?.toString();
  const approvalRequestNotificationId = formData.get("approvalRequestNotificationId")?.toString();

  logger.info("deleteApprovalRequestNotificationSubmit:sessionUser", sessionUser);
  logger.info("deleteApprovalRequestNotificationSubmit:groupId", groupId);
  logger.info("deleteApprovalRequestNotificationSubmit:approvalRequestNotificationId", approvalRequestNotificationId);

  if (!groupId || !approvalRequestNotificationId) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.group.deleteApprovalRequestNotification.mutate({
      groupId: groupId,
      notificationId: approvalRequestNotificationId,
      requestUserId: sessionUser.stampUserId,
    });
    return { isSuccess: true, message: "success" };
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
}
