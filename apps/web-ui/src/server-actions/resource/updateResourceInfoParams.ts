"use server";
import { stampHubClient } from "@/utils/stampHubClient";
import { getSessionUser } from "@/utils/sessionUser";
import { createServerLogger } from "@/logger";

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

  // フォームデータからinfoParamsの値を取得
  const infoParams: Record<string, string | number | boolean | string[]> = {};
  const formDataEntries = Array.from(formData.entries());

  // Collect array type markers
  const arrayTypeParams = new Set<string>();
  for (const [key] of formDataEntries) {
    if (key.startsWith("arrayParam_")) {
      const paramId = key.replace("arrayParam_", "");
      arrayTypeParams.add(paramId);
    }
  }

  // Group form entries by parameter ID
  const groupedParams: Record<string, string[]> = {};
  for (const [key, value] of formDataEntries) {
    if (key.startsWith("infoParam_")) {
      const paramId = key.replace("infoParam_", "");
      if (!groupedParams[paramId]) {
        groupedParams[paramId] = [];
      }
      groupedParams[paramId].push(value.toString());
    }
  }

  // Process grouped parameters
  for (const [paramId, values] of Object.entries(groupedParams)) {
    if (arrayTypeParams.has(paramId)) {
      // This parameter is marked as array type, always treat as array
      infoParams[paramId] = values.filter((v) => v.trim() !== "");
    } else if (values.length === 1) {
      // Single value - could be string, number, boolean, or comma-separated string[]
      const singleValue = values[0];
      if (singleValue.includes(",")) {
        // Legacy comma-separated format
        infoParams[paramId] = singleValue
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v !== "");
      } else {
        infoParams[paramId] = singleValue;
      }
    } else {
      // Multiple values - this is a string[] with dynamic fields
      infoParams[paramId] = values.filter((v) => v.trim() !== "");
    }
  }

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
