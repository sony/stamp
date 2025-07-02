"use server";

import { stampHubClient } from "@/utils/stampHubClient";
import { getSessionUser } from "@/utils/sessionUser";
import { createServerLogger } from "@/logger";
import { parseInfoParamsFromFormData } from "./formDataParser";

export type UpdateResourceInfoParamsWithApprovalState = { isSuccess: false; message: string } | { isSuccess: true; approvalRequestId: string } | undefined;

export async function updateResourceInfoParamsWithApprovalSubmit(
  prevState: UpdateResourceInfoParamsWithApprovalState,
  formData: FormData
): Promise<UpdateResourceInfoParamsWithApprovalState> {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();

  const catalogId = formData.get("catalogId") as string;
  const resourceTypeId = formData.get("resourceTypeId") as string;
  const resourceId = formData.get("resourceId") as string;
  const comment = formData.get("comment") as string;

  if (!catalogId || !resourceTypeId || !resourceId) {
    return { isSuccess: false, message: "Required fields are missing" };
  }

  // Process form data to extract infoParams
  const updateParams = parseInfoParamsFromFormData(formData);

  try {
    const result = await stampHubClient.userRequest.resource.updateParamsWithApproval.mutate({
      requestUserId: sessionUser.stampUserId,
      catalogId,
      resourceTypeId,
      resourceId,
      updateParams,
      comment,
    });

    if (!result || !result.approvalRequestId) {
      throw new Error("Failed to submit update request with approval: Approval Request ID is missing in the result");
    }

    // Return success with approvalRequestId for client-side redirect
    return { isSuccess: true, approvalRequestId: result.approvalRequestId };
  } catch (error: unknown) {
    logger.error("Failed to submit update request with approval:", error);
    return { isSuccess: false, message: error instanceof Error ? error.message : "An unexpected error occurred" };
  }
}
