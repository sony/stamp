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
  logger.info("updateApproverGroup:formData", formData);
  const catalogId = formData.get("catalogId")?.toString();
  const resourceTypeId = formData.get("resourceTypeId")?.toString();
  const resourceId = formData.get("resourceId")?.toString();
  const approverGroupId = formData.get("approverGroupId")?.toString();
  if (!catalogId || !resourceTypeId || !resourceId || !approverGroupId) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.resource.updateApprover.mutate({
      requestUserId: sessionUser.stampUserId,
      catalogId: catalogId,
      resourceTypeId: resourceTypeId,
      resourceId: resourceId,
      approverGroupId: approverGroupId,
    });
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
  return { isSuccess: true, message: "success" };
}
