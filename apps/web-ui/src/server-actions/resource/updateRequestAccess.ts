"use server";
import { stampHubClient } from "@/utils/stampHubClient";
import { getSessionUser } from "@/utils/sessionUser";
import { createServerLogger } from "@/logger";

export type UpdateRequestAccessState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

/**
 * Update a resource's requester groups and visibility from the "Request Access Setting" modal.
 * requesterGroupIds: every hidden input named "requesterGroupIds" (none = anyone can request).
 * visibility: "all" | "restricted".
 */
export async function updateRequestAccess(prevState: UpdateRequestAccessState | undefined, formData: FormData): Promise<UpdateRequestAccessState> {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();
  logger.info("updateRequestAccess:formData", formData);
  const catalogId = formData.get("catalogId")?.toString();
  const resourceTypeId = formData.get("resourceTypeId")?.toString();
  const resourceId = formData.get("resourceId")?.toString();
  const visibility = formData.get("visibility")?.toString();
  if (!catalogId || !resourceTypeId || !resourceId || (visibility !== "all" && visibility !== "restricted")) {
    return { message: "Lack of FormData params", isSuccess: false };
  }
  const requesterGroupIds = Array.from(
    new Set(
      formData
        .getAll("requesterGroupIds")
        .map((value) => value.toString())
        .filter((value) => value.length > 0)
    )
  );

  try {
    await stampHubClient.userRequest.resource.updateRequesterGroups.mutate({
      requestUserId: sessionUser.stampUserId,
      catalogId,
      resourceTypeId,
      resourceId,
      requesterGroupIds,
    });
  } catch (e) {
    return { message: `Failed to update requester groups: ${(e as Error).message}`, isSuccess: false };
  }
  try {
    await stampHubClient.userRequest.resource.updateVisibility.mutate({
      requestUserId: sessionUser.stampUserId,
      catalogId,
      resourceTypeId,
      resourceId,
      visibility,
    });
  } catch (e) {
    return { message: `Requester groups were updated, but failed to update visibility: ${(e as Error).message}`, isSuccess: false };
  }
  return { isSuccess: true, message: "success" };
}
