"use server";
import { stampHubClient } from "@/utils/stampHubClient";
import { getSessionUser } from "@/utils/sessionUser";
import { createServerLogger } from "@/logger";

export type UpdateOwnerrGroupState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function updateOwnerGroup(prevState: UpdateOwnerrGroupState | undefined, formData: FormData): Promise<UpdateOwnerrGroupState> {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();
  logger.info("updateOwnerGroup:formData", formData);
  const catalogId = formData.get("catalogId")?.toString();
  const resourceTypeId = formData.get("resourceTypeId")?.toString();
  const resourceId = formData.get("resourceId")?.toString();
  const ownerGroupId = formData.get("ownerGroupId")?.toString();
  if (!catalogId || !resourceTypeId || !resourceId || !ownerGroupId) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.resource.updateOwner.mutate({
      requestUserId: sessionUser.stampUserId,
      catalogId,
      resourceTypeId,
      resourceId,
      ownerGroupId,
    });
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
  return { isSuccess: true, message: "success" };
}
