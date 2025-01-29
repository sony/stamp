"use server";
import { stampHubClient } from "@/utils/stampHubClient";

import { getSessionUser } from "@/utils/sessionUser";
import { ResourceType } from "@/type";
import { createServerLogger } from "@/logger";

export type CreateResourceState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function createResourceSubmit(prevState: CreateResourceState | undefined, formData: FormData): Promise<CreateResourceState> {
  const logger = createServerLogger();
  const sessionUser = await getSessionUser();
  logger.info("createResourceSubmit:formData", formData);
  const catalogId = formData.get("catalogId")?.toString();
  const resourceTypeId = formData.get("resourceTypeId")?.toString();
  const ownerGroupId = formData.get("ownerGroupId")?.toString();
  const approverGroupId = formData.get("approverGroupId")?.toString();
  if (!catalogId || !resourceTypeId) {
    return { message: "Internal Sever Error", isSuccess: false };
  }

  const resourceType = await stampHubClient.userRequest.resourceType.get.query({
    requestUserId: sessionUser.stampUserId,
    catalogId: catalogId,
    resourceTypeId: resourceTypeId,
  });

  const { isSuccess: parseIsSuccess, parsedParams, errors } = parseCreateResourceParams(formData, resourceType);
  if (!parseIsSuccess) {
    return { errors: errors, message: "Input param is invalid", isSuccess: false };
  }

  const { isSuccess: parentResourceIdIsSuccess, parentResourceId } = parseParentResourceId(formData, resourceType);
  if (!parentResourceIdIsSuccess) {
    return { errors: { parentResourceId: ["parent ResourceId is required"] }, message: "parentResourceId is invalid", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.resource.create.mutate({
      requestUserId: sessionUser.stampUserId,
      catalogId: catalogId,
      resourceTypeId: resourceTypeId,
      parentResourceId: parentResourceId,
      inputParams: parsedParams,
      ownerGroupId: ownerGroupId,
      approverGroupId: approverGroupId,
    });
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }

  return { message: "success", isSuccess: true };
}

function parseCreateResourceParams(
  formData: FormData,
  resourceType: ResourceType
): { isSuccess: boolean; parsedParams: Record<string, string | number | boolean | string[]>; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};
  const params: Record<string, string | number | boolean | string[]> = {};
  let isSuccess = true;
  for (const param of resourceType.createParams) {
    // define formDataName is src/components/resource/createParam.tsx
    const formDataName = `createParam_${param.id}`;
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
        params[param.id] = value;
        break;
      }
      case param.type === "number": {
        const numberValue = Number(value);
        if (isNaN(numberValue)) {
          errors[formDataName] = ["number"];
          isSuccess = false;
          continue;
        }
        params[param.id] = numberValue;
        break;
      }
      case param.type === "boolean": {
        params[param.id] = value === "true";
        break;
      }
      case param.type === "string[]": {
        //retrieve string array value
        const formDataEntryValue = formData.getAll(formDataName);
        const stringArrayValue = formDataEntryValue.map((v) => v.toString()).filter((v) => v !== "");
        params[param.id] = stringArrayValue;
        break;
      }
    }
  }
  return { isSuccess: isSuccess, parsedParams: params, errors: errors };
}

function parseParentResourceId(formData: FormData, resourceType: ResourceType): { isSuccess: boolean; parentResourceId?: string } {
  if (typeof resourceType.parentResourceTypeId === "undefined") {
    return { isSuccess: true };
  }

  // define parentResourceId is src/components/resource/selectParentResource.tsx
  const parentResourceId = formData.get("parentResourceId")?.toString();
  if (!parentResourceId) {
    return { isSuccess: false };
  }
  return { isSuccess: true, parentResourceId: parentResourceId };
}
