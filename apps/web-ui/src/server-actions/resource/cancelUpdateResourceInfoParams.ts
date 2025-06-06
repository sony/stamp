"use server";

import { stampHubClient } from "@/utils/stampHubClient";
import { getSessionUser } from "@/utils/sessionUser";
import { createServerLogger } from "@/logger";

export type CancelUpdateResourceInfoParamsState = { isSuccess: true } | { isSuccess: false; message: string } | undefined;

export async function cancelUpdateResourceInfoParamsSubmit(
  prevState: CancelUpdateResourceInfoParamsState,
  formData: FormData
): Promise<CancelUpdateResourceInfoParamsState> {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();

  try {
    const catalogId = formData.get("catalogId") as string;
    const resourceTypeId = formData.get("resourceTypeId") as string;
    const resourceId = formData.get("resourceId") as string;

    if (!catalogId || !resourceTypeId || !resourceId) {
      return { isSuccess: false, message: "Required fields are missing" };
    }

    await stampHubClient.userRequest.resource.cancelUpdateParamsWithApproval.mutate({
      requestUserId: sessionUser.stampUserId,
      catalogId,
      resourceTypeId,
      resourceId,
    });

    return { isSuccess: true };
  } catch (error: unknown) {
    logger.error("Failed to cancel update request:", error);
    return { isSuccess: false, message: error instanceof Error ? error.message : "An unexpected error occurred" };
  }
}
