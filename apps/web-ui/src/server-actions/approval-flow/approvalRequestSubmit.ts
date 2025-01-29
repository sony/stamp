"use server";
import { ApprovalFlow } from "@/type";
import { getSessionUserOrUndefned } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";
import { redirect } from "next/navigation";
import { createServerLogger } from "@/logger";

export type ApprovalRequestSubmitState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function approvalRequestSubmit(prevState: ApprovalRequestSubmitState | undefined, formData: FormData) {
  const logger = createServerLogger();
  const sessionUser = await getSessionUserOrUndefned();
  logger.info("approvalRequestSubmit:sessionUser", sessionUser);
  logger.info("approvalRequestSubmit:comment", formData.get("comment"));
  logger.info("approvalRequestSubmit:catalogId", formData.get("catalogId"));
  logger.info("approvalRequestSubmit:approvalFlowId", formData.get("approvalFlowId"));

  const comment = formData.get("comment");
  const catalogId = formData.get("catalogId");
  const approvalFlowId = formData.get("approvalFlowId");
  if (comment === null || catalogId === null || approvalFlowId === null || sessionUser === undefined) {
    return;
  }
  const approvalFlowInfo = await getApprovalFlow(catalogId.toString(), approvalFlowId.toString());

  const { isSuccess: parseIsSuccess, parsedParams, errors: paramsErros } = parsedInputParams(formData, approvalFlowInfo);
  if (!parseIsSuccess) {
    return { errors: paramsErros, message: "Input param is invalid", isSuccess: false };
  }

  const { isSuccess: parseResourcesIsSuccess, parsedResources, errors: resourceErrors } = parsedInputResources(formData, approvalFlowInfo);
  if (!parseResourcesIsSuccess) {
    return { errors: resourceErrors, message: "Input param is invalid", isSuccess: false };
  }

  logger.info("approvalRequestSubmit:parsedParams", parsedParams);
  logger.info("approvalRequestSubmit:parsedResources", parsedResources);
  let approvalRequestId: string;
  try {
    const result = await stampHubClient.userRequest.approvalRequest.submit.mutate({
      inputParams: parsedParams,
      catalogId: catalogId.toString(),
      approvalFlowId: approvalFlowId.toString(),
      inputResources: parsedResources,
      requestUserId: sessionUser.stampUserId,
      requestComment: comment.toString(),
    });
    logger.info("approvalRequestSubmit:result", result);
    if (!result || !result.requestId) {
      throw new Error("Failed to submit approval request: Request ID is missing in the result");
    }
    approvalRequestId = result.requestId;
  } catch (e) {
    logger.error("approvalRequestSubmit:error", e);
    return { message: (e as Error).message, isSuccess: false };
  }

  redirect(`/catalog/${encodeURIComponent(catalogId.toString())}/approval-flow/${encodeURIComponent(approvalFlowId.toString())}/request/${approvalRequestId}`);
}

export async function getApprovalFlow(catalogId: string, approvalFlowId: string) {
  const approvalFlow = await stampHubClient.userRequest.approvalFlow.get.query({
    catalogId: catalogId,
    approvalFlowId: approvalFlowId,
  });
  return approvalFlow;
}

function parsedInputParams(
  formData: FormData,
  approvalFlowInfo: ApprovalFlow
): {
  isSuccess: boolean;
  parsedParams: {
    value: string | number | boolean;
    id: string;
  }[];
  errors: Record<string, string[]>;
} {
  const params: {
    value: string | number | boolean;
    id: string;
  }[] = [];
  const errors: Record<string, string[]> = {};
  let isSuccess = true;

  for (const param of approvalFlowInfo.inputParams) {
    // define formDataName at src/components/approval-flow/inputParam.tsx
    const formDataName = `inputParam_${param.id}`;
    const value = formData.get(formDataName)?.toString();
    if (value === undefined && param.required) {
      errors[formDataName] = ["required"];
      isSuccess = false;
      continue;
    }
    if (value === undefined) {
      continue;
    }

    switch (true) {
      case param.type === "string": {
        params.push({ id: param.id, value: value });
        break;
      }
      case param.type === "number": {
        const numberValue = Number(value);
        if (isNaN(numberValue)) {
          errors[formDataName] = ["number"];
          isSuccess = false;
          continue;
        }
        params.push({ id: param.id, value: numberValue });
        break;
      }
      case param.type === "boolean": {
        const booleanValue = value === "true";
        params.push({ id: param.id, value: booleanValue });
        break;
      }
    }
  }
  return { isSuccess, parsedParams: params, errors };
}

function parsedInputResources(
  formData: FormData,
  approvalFlowInfo: ApprovalFlow
): {
  isSuccess: boolean;
  parsedResources: {
    resourceTypeId: string;
    resourceId: string;
  }[];
  errors: Record<string, string[]>;
} {
  const resources: {
    resourceTypeId: string;
    resourceId: string;
  }[] = [];
  const errors: Record<string, string[]> = {};

  let isSuccess = true;
  if (approvalFlowInfo.inputResources === undefined) {
    return { isSuccess, parsedResources: resources, errors };
  }

  for (const resource of approvalFlowInfo.inputResources) {
    // define formDataName at src/components/approval-flow/inputResource.tsx
    const formDataName = `inputResource_${resource.resourceTypeId}`;
    const value = formData.get(formDataName)?.toString();
    if (value === undefined) {
      errors[formDataName] = ["required"];
      isSuccess = false;
      continue;
    } else {
      resources.push({ resourceTypeId: resource.resourceTypeId, resourceId: value });
    }
  }
  return { isSuccess, parsedResources: resources, errors };
}
