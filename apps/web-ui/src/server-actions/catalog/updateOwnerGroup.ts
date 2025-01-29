"use server";
import { stampHubClient } from "@/utils/stampHubClient";
import { getSessionUser } from "@/utils/sessionUser";
import { createServerLogger } from "@/logger";

export type UpdateOwnerGroupState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function updateOwnerGroup(prevState: UpdateOwnerGroupState | undefined, formData: FormData): Promise<UpdateOwnerGroupState> {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();
  logger.info("updateOwnerGroup:formData", formData);
  const catalogId = formData.get("catalogId")?.toString();
  const ownerGroupId = formData.get("ownerGroupId")?.toString();
  if (!catalogId || !ownerGroupId) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.catalog.update.mutate({
      requestUserId: sessionUser.stampUserId,
      id: catalogId,
      ownerGroupId,
    });
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
  return { isSuccess: true, message: "success" };
}
