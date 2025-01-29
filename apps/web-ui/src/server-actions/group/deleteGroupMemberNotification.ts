"use server";
import { createServerLogger } from "@/logger";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";

export type DeleteGroupMemberNotificationState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function deleteGroupMemberNotificationSubmit(prevState: DeleteGroupMemberNotificationState | undefined, formData: FormData) {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();
  const groupId = formData.get("groupId")?.toString();
  const groupMemberNotificationId = formData.get("groupMemberNotificationId")?.toString();

  logger.info("deleteGroupMemberNotificationSubmit:sessionUser", sessionUser);
  logger.info("deleteGroupMemberNotificationSubmit:groupId", groupId);
  logger.info("deleteGroupMemberNotificationSubmit:groupMemberNotificationId", groupMemberNotificationId);

  if (!groupId || !groupMemberNotificationId) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.group.deleteGroupMemberNotification.mutate({
      groupId: groupId,
      notificationId: groupMemberNotificationId,
      requestUserId: sessionUser.stampUserId,
    });
    return { isSuccess: true, message: "success" };
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
}
