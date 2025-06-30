import { Result, ok, err } from "neverthrow";
import { StampHubError } from "../../../error";
import { UpdateResourceParamsWithApprovalInput } from "../input";
import { parseZodObject } from "../../../utils/neverthrow";

// =============================================================================
// Pure Validation Functions
// =============================================================================

/**
 * Validates the input parameters for resource update with approval
 * Pure function - no side effects, easy to test
 */
export const validateInput = (input: UpdateResourceParamsWithApprovalInput): Result<UpdateResourceParamsWithApprovalInput, StampHubError> => {
  const parsedResult = parseZodObject(input, UpdateResourceParamsWithApprovalInput);
  if (parsedResult.isErr()) {
    return err(parsedResult.error);
  }
  return ok(parsedResult.value);
};

/**
 * Validates that a resource type is updatable
 * Pure function - takes data, returns validation result
 */
export const validateResourceTypeUpdatable = (resourceTypeInfo: {
  isUpdatable?: boolean;
  updateApprover?: { approverType?: string } | null;
}): Result<void, StampHubError> => {
  if (resourceTypeInfo.isUpdatable === false && !resourceTypeInfo.updateApprover) {
    return err(new StampHubError("Resource type is not updatable", "ResourceType Not Updatable", "BAD_REQUEST"));
  }
  return ok(undefined);
};

/**
 * Validates that a resource type has update capability
 * Pure function - checks updatable flag
 */
export const validateResourceTypeHasUpdateCapability = (resourceTypeInfo: { isUpdatable?: boolean }): Result<void, StampHubError> => {
  if (!resourceTypeInfo.isUpdatable) {
    return err(new StampHubError("Resource type is not updatable", "Resource Type Not Updatable", "BAD_REQUEST"));
  }
  return ok(undefined);
};

/**
 * Validates that a resource doesn't have pending updates
 * Pure function - checks resource state
 */
export const validateResourceNotPending = (resource: {
  pendingUpdateParams?: { approvalRequestId: string; updateParams: unknown } | null;
}): Result<void, StampHubError> => {
  if (resource.pendingUpdateParams) {
    return err(new StampHubError("Resource already has a pending update params request", "Resource Pending Update", "CONFLICT"));
  }
  return ok(undefined);
};

/**
 * Validates approver type configuration
 * Pure function - validates approver type rules
 */
export const validateApproverType = (updateApprover?: { approverType?: string }): Result<void, StampHubError> => {
  if (updateApprover?.approverType === "this") {
    return err(new StampHubError("Approver type is 'this'", "Approver type is 'this'", "BAD_REQUEST"));
  }
  return ok(undefined);
};

/**
 * Validates that a parent resource exists and has approver group
 * Pure function - validates parent resource data
 */
export const validateParentResourceApprover = (parentResource?: { approverGroupId?: string }): Result<string, StampHubError> => {
  if (!parentResource) {
    return err(new StampHubError("Parent resource not found", "Parent Resource Not Found", "BAD_REQUEST"));
  }

  if (!parentResource.approverGroupId) {
    return err(new StampHubError("Parent resource does not have an approver group", "Parent Resource No Approver Group", "BAD_REQUEST"));
  }

  return ok(parentResource.approverGroupId);
};

/**
 * Validates that a resource update approval flow exists in catalog config
 * Pure function - searches for approval flow
 */
export const validateApprovalFlowExists = (catalogConfig: { approvalFlows: Array<{ id: string }> }): Result<{ id: string }, StampHubError> => {
  const resourceUpdateFlow = catalogConfig.approvalFlows.find((flow) => flow.id === "resource-update");
  if (!resourceUpdateFlow) {
    return err(new StampHubError("Resource update approval flow not found", "Internal server error", "INTERNAL_SERVER_ERROR"));
  }
  return ok(resourceUpdateFlow);
};
