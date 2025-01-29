"use server";
import { stampHubClient } from "@/utils/stampHubClient";
import { getSessionUser } from "@/utils/sessionUser";
import { createServerLogger } from "@/logger";

export type DeleteResourceState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function deleteResource(prevState: DeleteResourceState | undefined, formData: FormData): Promise<DeleteResourceState> {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();
  logger.info("deleteResource:formData", formData);
  const catalogId = formData.get("catalogId")?.toString();
  const resourceTypeId = formData.get("resourceTypeId")?.toString();
  const resourceId = formData.get("resourceId")?.toString();
  if (!catalogId || !resourceTypeId || !resourceId) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.resource.delete.mutate({
      requestUserId: sessionUser.stampUserId,
      catalogId,
      resourceTypeId,
      resourceId,
    });
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
  return { isSuccess: true, message: "success" };
}
