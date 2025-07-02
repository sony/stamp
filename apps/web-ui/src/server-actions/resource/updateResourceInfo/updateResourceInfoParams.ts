"use server";
import { stampHubClient } from "@/utils/stampHubClient";
import { getSessionUser } from "@/utils/sessionUser";
import { createServerLogger } from "@/logger";
import { parseInfoParamsFromFormData } from "./formDataParser";

export type UpdateResourceInfoParamsState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function updateResourceInfoParamsSubmit(
  prevState: UpdateResourceInfoParamsState | undefined,
  formData: FormData
): Promise<UpdateResourceInfoParamsState> {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();
  logger.info("updateResourceInfoParams:formData", formData);

  const catalogId = formData.get("catalogId")?.toString();
  const resourceTypeId = formData.get("resourceTypeId")?.toString();
  const resourceId = formData.get("resourceId")?.toString();

  if (!catalogId || !resourceTypeId || !resourceId) {
    return { message: "Required parameters are missing", isSuccess: false };
  }

  // Parse form data to extract infoParams
  const infoParams = parseInfoParamsFromFormData(formData);

  try {
    await stampHubClient.userRequest.resource.updateParams.mutate({
      requestUserId: sessionUser.stampUserId,
      catalogId,
      resourceTypeId,
      resourceId,
      updateParams: infoParams,
    });
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }

  return { isSuccess: true, message: "Info params updated successfully" };
}
