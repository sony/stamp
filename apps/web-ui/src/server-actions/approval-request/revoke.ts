"use server";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";

export type RevokeState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function revokeSubmit(prevState: RevokeState | undefined, formData: FormData) {
  const sessionUser = await getSessionUser();

  const approvalRequestId = formData.get("approvalRequestId");
  const comment = formData.get("comment");

  if (approvalRequestId === null || comment === null) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.approvalRequest.revoke.mutate({
      approvalRequestId: approvalRequestId.toString(),
      revokedComment: comment.toString(),
      userIdWhoRevoked: sessionUser.stampUserId,
    });
    return { isSuccess: true, message: "success" };
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
}
