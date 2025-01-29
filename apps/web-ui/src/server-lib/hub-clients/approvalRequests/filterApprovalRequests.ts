import { ApprovalRequest } from "@/type";
import { ApprovalRequestInputParam, ApprovalRequestInputResource } from "@stamp-lib/stamp-types/models";

const statusValues = ["submitted", "validationFailed", "pending", "approved", "approvedActionFailed", "rejected", "revoked", "revokedActionFailed"] as const;
type StatusType = (typeof statusValues)[number] | undefined;
export function parseStatusType(status: string | undefined): StatusType {
  if (typeof status === "string" && statusValues.includes(status as (typeof statusValues)[number])) {
    return status as StatusType;
  }
  return undefined;
}

export function parseInputParams(searchParams: { [key: string]: string | string[] | undefined }, prefix: string = "inputParams_"): ApprovalRequestInputParam[] {
  return Object.entries(searchParams)
    .filter(([key, value]) => key.startsWith(prefix) && typeof value === "string")
    .map(([key, value]) => ({
      id: key.slice(prefix.length),
      value: value as string,
    }));
}

export function parseInputResources(
  searchParams: { [key: string]: string | string[] | undefined },
  prefix: string = "inputResources_"
): ApprovalRequestInputResource[] {
  return Object.entries(searchParams)
    .filter(([key, value]) => key.startsWith(prefix) && typeof value === "string")
    .map(([key, value]) => ({
      resourceTypeId: key.slice(prefix.length),
      resourceId: value as string,
    }));
}

export type FilterParam = {
  status?: StatusType;
  inputParams: ApprovalRequestInputParam[];
  inputResources: ApprovalRequestInputResource[];
  approverId?: string;
  requestUserId?: string;
  catalogId?: string;
  approvalFlowId?: string;
};

export const filterApprovalRequests =
  (filterParam: FilterParam) =>
  (approvalRequests: ApprovalRequest[]): ApprovalRequest[] => {
    return approvalRequests.filter((request) => {
      // If status is specified, check if it matches
      if (filterParam.status) {
        if (filterParam.status === "approved") {
          // For improving usability, include 'approvedActionSucceeded' when filter status is 'approved'
          if (!["approved", "approvedActionSucceeded"].includes(request.status)) {
            return false;
          }
        } else if (filterParam.status === "revoked") {
          // For improving usability, include 'revokedActionSucceeded' when filter status is 'revoked'
          if (!["revoked", "revokedActionSucceeded"].includes(request.status)) {
            return false;
          }
        } else {
          if (request.status !== filterParam.status) {
            return false;
          }
        }
      }
      // Check if inputParam matches
      const isParamsMatch = filterParam.inputParams.every((param) => {
        const match = request.inputParams.some((reqParam) => {
          const castedValue = castValue(param.value);
          return reqParam.id === param.id && reqParam.value === castedValue;
        });
        return match;
      });
      if (!isParamsMatch) {
        return false;
      }

      // Check if inputResource matches
      const isResourcesMatch = filterParam.inputResources.every((resource) =>
        request.inputResources.some((reqResource) => reqResource.resourceTypeId === resource.resourceTypeId && reqResource.resourceId === resource.resourceId)
      );
      if (!isResourcesMatch) {
        return false;
      }

      // If approverId is specified, check if it matches
      if (filterParam.approverId && request.approverId !== filterParam.approverId) {
        return false;
      }

      // If RequesterId is specified, check if it matches
      if (filterParam.requestUserId && request.requestUserId !== filterParam.requestUserId) {
        return false;
      }

      // If CatalogId is specified, check if it matches
      if (filterParam.catalogId && request.catalogId !== filterParam.catalogId) {
        return false;
      }

      // If approvalFlowId is specified, check if it matches
      if (filterParam.approvalFlowId && request.approvalFlowId !== filterParam.approvalFlowId) {
        return false;
      }

      return true;
    });
  };

const castValue = (value: string | number | boolean): string | number | boolean => {
  if (typeof value !== "string") {
    return value;
  }

  const numValue = Number(value);
  if (!isNaN(numValue)) {
    return numValue;
  }

  switch (value.toLowerCase()) {
    case "true":
      return true;
    case "false":
      return false;
    default:
      return value;
  }
};
