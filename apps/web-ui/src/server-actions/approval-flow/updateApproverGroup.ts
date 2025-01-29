"use server";
import { stampHubClient } from "@/utils/stampHubClient";
import { getSessionUser } from "@/utils/sessionUser";
import { createServerLogger } from "@/logger";

export type UpdateApproverGroupState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function updateApproverGroup(prevState: UpdateApproverGroupState | undefined, formData: FormData): Promise<UpdateApproverGroupState> {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();
  logger.info(`${sessionUser.stampUserId} requested updateApproverGroup:formData`, JSON.stringify(formData));
  const catalogId = formData.get("catalogId")?.toString();
  const approvalFlowId = formData.get("approvalFlowId")?.toString();
  const approverGroupId = formData.get("approverGroupId")?.toString();
  if (!catalogId || !approvalFlowId || !approverGroupId) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.approvalFlow.update.mutate({
      requestUserId: sessionUser.stampUserId,
      catalogId,
      approvalFlowId,
      approverGroupId,
    });
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
  return { isSuccess: true, message: "success" };
}
