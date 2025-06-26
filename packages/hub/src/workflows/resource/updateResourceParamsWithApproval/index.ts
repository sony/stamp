import { ResultAsync, errAsync, okAsync } from "neverthrow";

import { StampHubError } from "../../../error";
import { UpdateResourceParamsWithApprovalInput } from "../input";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { Logger } from "@stamp-lib/stamp-logger";
import { getResourceInfo, GetResourceInfo } from "../getResourceInfo";
import { createResolveResourceWithFallback, createResolveApproverGroup, createResolveSystemCatalog } from "./resolution";
import { createExecuteApprovalWorkflow, SubmitWorkflowForResourceUpdate } from "./execution";
import { createGetCatalogConfig } from "../../../events/catalog/catalogConfig";
import { getResourceTypeInfo } from "../../resource-type/getResourceTypeInfo";

// Import validation functions
import { validateInput, validateResourceTypeUpdatable } from "./validation";

// Import resolution functions
import { resolveApprovalFlow } from "./resolution";

// =============================================================================
// Factory Functions for Creating Workflow Dependencies
// =============================================================================

/**
 * Factory function to create all necessary workflow functions
 * This eliminates the redundancy in Providers input by pre-creating composed functions
 */
export const createWorkflowDependencies = (providers: {
  catalogConfigProvider: CatalogConfigProvider;
  resourceDBProvider: ResourceDBProvider;
  submitWorkflow: SubmitWorkflowForResourceUpdate;
  logger: Logger;
}) => {
  const { catalogConfigProvider, resourceDBProvider, submitWorkflow, logger } = providers;

  // Create pre-composed functions
  const getCatalogConfig = createGetCatalogConfig(catalogConfigProvider.get);
  const getResourceTypeInfoFunc = getResourceTypeInfo(getCatalogConfig);

  // Create base resource info function
  const getResourceInfoFunc: GetResourceInfo = getResourceInfo({
    getCatalogConfigProvider: catalogConfigProvider.get,
    getResourceDBProvider: resourceDBProvider.getById,
  });

  // Create pre-composed workflow functions
  const resolveResource = createResolveResourceWithFallback(resourceDBProvider.getById, resourceDBProvider.set, getResourceInfoFunc, logger);

  const resolveApprover = createResolveApproverGroup(getResourceInfoFunc);

  const getSystemCatalogResult = () => createResolveSystemCatalog(catalogConfigProvider);

  const executeWorkflow = createExecuteApprovalWorkflow(submitWorkflow, resourceDBProvider, logger);

  return {
    getResourceTypeInfo: getResourceTypeInfoFunc,
    resolveResource,
    resolveApprover,
    getSystemCatalogResult,
    executeWorkflow,
    logger,
  };
};

// =============================================================================
// Type Definitions
// =============================================================================

export type WorkflowDependencies = ReturnType<typeof createWorkflowDependencies>;

export type Providers = WorkflowDependencies;

export const updateResourceParamsWithApproval =
  (providers: Providers) =>
  (input: UpdateResourceParamsWithApprovalInput): ResultAsync<{ approvalRequestId: string }, StampHubError> => {
    providers.logger.info(
      `[updateResourceParamsWithApproval] called with catalogId=${input.catalogId}, resourceTypeId=${input.resourceTypeId}, resourceId=${input.resourceId}`
    );

    // Step 1: Validate input parameters (pure function)
    const inputValidationResult = validateInput(input);
    providers.logger.debug(`[updateResourceParamsWithApproval] Input validation result: ${inputValidationResult.isOk() ? "Success" : "Failure"}`);
    if (inputValidationResult.isErr()) {
      providers.logger.error(`[updateResourceParamsWithApproval] Input validation failed: ${inputValidationResult.error.message}`);
      return errAsync(inputValidationResult.error);
    }

    // Step 2: Get resource type information and validate updatability
    const getResourceTypeInfoResult = providers
      .getResourceTypeInfo({
        catalogId: input.catalogId,
        resourceTypeId: input.resourceTypeId,
        requestUserId: input.requestUserId,
      })
      .andThen((resourceTypeInfo) => {
        // Pure validation function
        const validationResult = validateResourceTypeUpdatable(resourceTypeInfo);
        providers.logger.debug(`[updateResourceParamsWithApproval] Resource type validation result: ${validationResult.isOk() ? "Success" : "Failure"}`);
        if (validationResult.isErr()) {
          providers.logger.error(`[updateResourceParamsWithApproval] Resource type validation failed: ${validationResult.error.message}`);
          return errAsync(validationResult.error);
        }
        return okAsync(resourceTypeInfo);
      });

    providers.logger.debug(`[updateResourceParamsWithApproval] Resource type info retrieval }`);
    // Compose the complete workflow pipeline using pre-created functions
    return getResourceTypeInfoResult
      .andThen((resourceTypeInfo) => {
        providers.logger.debug(`[updateResourceParamsWithApproval] Resolving resource for resourceTypeId=${resourceTypeInfo.id}`);
        return providers.resolveResource(input).andThen((resource) => {
          providers.logger.debug(`[updateResourceParamsWithApproval] Resolving approver for resourceTypeId=${resourceTypeInfo.id}`);
          return providers.resolveApprover(resourceTypeInfo, resource, input);
        });
      })
      .andThen((approverGroupId) => {
        return providers.getSystemCatalogResult().andThen((catalogConfig) => {
          providers.logger.debug(`[updateResourceParamsWithApproval] Resolving approval flow for catalogId=${input.catalogId}`);
          return resolveApprovalFlow(catalogConfig).andThen(() => {
            providers.logger.debug(`[updateResourceParamsWithApproval] Executing approval workflow for approverGroupId=${approverGroupId}`);
            return providers.executeWorkflow(approverGroupId, input);
          });
        });
      });
  };
