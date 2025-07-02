"use server";

import { stampHubClient } from "@/utils/stampHubClient";
import { getSessionUser } from "@/utils/sessionUser";
import { createServerLogger } from "@/logger";

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
  const updateParams: Record<string, string | number | boolean | string[]> = {};
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
      updateParams[paramId] = values.filter((v) => v.trim() !== "");
    } else if (values.length === 1) {
      // Single value - could be string, number, boolean, or comma-separated string[]
      const singleValue = values[0];
      if (singleValue.includes(",")) {
        // Legacy comma-separated format
        updateParams[paramId] = singleValue
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v !== "");
      } else {
        updateParams[paramId] = singleValue;
      }
    } else {
      // Multiple values - this is a string[] with dynamic fields
      updateParams[paramId] = values.filter((v) => v.trim() !== "");
    }
  }

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
