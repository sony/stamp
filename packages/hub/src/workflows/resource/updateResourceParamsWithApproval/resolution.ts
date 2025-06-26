import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { StampHubError } from "../../../error";
import { UpdateResourceParamsWithApprovalInput } from "../input";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import {
  validateResourceNotPending,
  validateResourceTypeHasUpdateCapability,
  validateApproverType,
  validateParentResourceApprover,
  validateApprovalFlowExists,
} from "./validation";
import { GetResourceInfo } from "../getResourceInfo";
import { Logger } from "@stamp-lib/stamp-logger";

// =============================================================================
// Higher-Order Data Resolution Functions
// =============================================================================

/**
 * Creates a function to resolve resource with fallback creation
 * Higher-order function that takes dependencies and returns a function
 */
export const createResolveResourceWithFallback =
  (getById: ResourceDBProvider["getById"], set: ResourceDBProvider["set"], getResourceInfo: GetResourceInfo, logger: Logger) =>
  (input: UpdateResourceParamsWithApprovalInput): ResultAsync<unknown, StampHubError> => {
    const getResourceDBResult = getById({
      id: input.resourceId,
      catalogId: input.catalogId,
      resourceTypeId: input.resourceTypeId,
    });

    const getResourceInfoResult = getResourceInfo(input);
    logger.debug(
      `[createResolveResourceWithFallback] Resolving resource for catalogId=${input.catalogId}, resourceTypeId=${input.resourceTypeId}, resourceId=${input.resourceId}`
    );
    return ResultAsync.combine([getResourceDBResult, getResourceInfoResult])
      .andThen(([resourceDBOpt, resourceInfoOpt]) => {
        if (resourceInfoOpt.isNone()) {
          return errAsync(new StampHubError("Resource not found", "Resource Not Found", "NOT_FOUND"));
        }

        if (resourceDBOpt.isNone()) {
          // Create a new resource if it does not exist
          const newResource = {
            id: input.resourceId,
            catalogId: input.catalogId,
            resourceTypeId: input.resourceTypeId,
          };
          return set(newResource).andThen(() => {
            return okAsync(resourceInfoOpt.value);
          });
        }

        return okAsync(resourceInfoOpt.value);
      })
      .mapErr((error) => {
        logger.error(`[createResolveResourceWithFallback] Error resolving resource: ${error.message}`, error);
        if (error instanceof StampHubError) {
          return error;
        }
        return new StampHubError("Failed to resolve resource", "Internal server error", "INTERNAL_SERVER_ERROR");
      });
  };

/**
 * Creates a function to resolve approver group ID
 * Higher-order function that handles different approver types
 */
export const createResolveApproverGroup =
  (getResourceInfo: GetResourceInfo) =>
  (resourceTypeInfo: unknown, resource: unknown, input: UpdateResourceParamsWithApprovalInput): ResultAsync<string, StampHubError> => {
    // Type assertions for safety - in real implementation, we'd have proper types
    const resourceType = resourceTypeInfo as {
      isUpdatable?: boolean;
      updateApprover?: { approverType?: string };
      parentResourceTypeId?: string;
    };

    const resourceData = resource as {
      pendingUpdateParams?: { approvalRequestId: string; updateParams: unknown } | null;
      parentResourceId?: string;
    };

    // Validate resource state
    const pendingValidation = validateResourceNotPending(resourceData);
    console.log(`[createResolveApproverGroup] Pending validation result: ${pendingValidation.isOk() ? "Success" : "Failure"}`);
    if (pendingValidation.isErr()) {
      return errAsync(pendingValidation.error);
    }

    // Validate updatable capability
    const updateCapabilityValidation = validateResourceTypeHasUpdateCapability(resourceType);
    console.log(`[createResolveApproverGroup] Update capability validation result: ${updateCapabilityValidation.isOk() ? "Success" : "Failure"}`);
    if (updateCapabilityValidation.isErr()) {
      return errAsync(updateCapabilityValidation.error);
    }

    // Validate approver type
    const approverTypeValidation = validateApproverType(resourceType.updateApprover);
    console.log(`[createResolveApproverGroup] Approver type validation result: ${approverTypeValidation.isOk() ? "Success" : "Failure"}`);
    if (approverTypeValidation.isErr()) {
      return errAsync(approverTypeValidation.error);
    }

    // Resolve approver based on type
    if (resourceType.updateApprover?.approverType === "parentResource") {
      return getResourceInfo({
        catalogId: input.catalogId,
        resourceTypeId: resourceType.parentResourceTypeId ?? "",
        resourceId: resourceData.parentResourceId ?? "",
        requestUserId: input.requestUserId,
      }).andThen((parentResourceOpt) => {
        if (parentResourceOpt.isNone()) {
          return errAsync(new StampHubError("Parent resource not found", "Parent Resource Not Found", "BAD_REQUEST"));
        }

        const parentResourceValidation = validateParentResourceApprover(parentResourceOpt.value as { approverGroupId?: string });
        if (parentResourceValidation.isErr()) {
          return errAsync(parentResourceValidation.error);
        }

        return okAsync(parentResourceValidation.value);
      });
    } else {
      return errAsync(new StampHubError("Resource type does not have an approver group", "Resource Type No Approver Group", "BAD_REQUEST"));
    }
  };

/**
 * Creates a function to resolve system catalog configuration
 * Higher-order function for system catalog access
 */
export const createResolveSystemCatalog = (catalogConfigProvider: CatalogConfigProvider): ResultAsync<unknown, StampHubError> => {
  return catalogConfigProvider
    .get("stamp-system")
    .andThen((catalogConfig) => {
      if (catalogConfig.isNone()) {
        return errAsync(new StampHubError("Failed to get stamp-system catalog config", "Internal server error", "INTERNAL_SERVER_ERROR"));
      }
      return okAsync(catalogConfig.value);
    })
    .mapErr((error) => {
      if (error instanceof StampHubError) {
        return error;
      }
      return new StampHubError("Failed to get system catalog", "Internal server error", "INTERNAL_SERVER_ERROR");
    });
};

/**
 * Creates a function to resolve approval flow from catalog config
 * Pure function that searches for resource-update flow
 */
export const resolveApprovalFlow = (catalogConfig: unknown): ResultAsync<unknown, StampHubError> => {
  const config = catalogConfig as { approvalFlows: Array<{ id: string }> };
  const flowValidation = validateApprovalFlowExists(config);
  console.log(`[resolveApprovalFlow] Flow validation result: ${flowValidation.isOk() ? "Success" : "Failure"}`);
  if (flowValidation.isErr()) {
    return errAsync(flowValidation.error);
  }

  return okAsync(flowValidation.value);
};
