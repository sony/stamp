"use server";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";

export type RejectState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function rejectSubmit(prevState: RejectState | undefined, formData: FormData) {
  const sessionUser = await getSessionUser();

  const approvalRequestId = formData.get("approvalRequestId");
  const comment = formData.get("comment");

  if (approvalRequestId === null || comment === null) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.approvalRequest.reject.mutate({
      approvalRequestId: approvalRequestId.toString(),
      rejectComment: comment.toString(),
      userIdWhoRejected: sessionUser.stampUserId,
    });
    return { isSuccess: true, message: "success" };
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
}
