import { ok, Result } from "neverthrow";
import { PendingRequest, ApprovalFlowConfig, CatalogConfig, InputParamWithName, InputResourceWithName } from "@stamp-lib/stamp-types/models";
import { Logger } from "@stamp-lib/stamp-logger";

export type EnrichedInputData = {
  inputParamsWithNames: InputParamWithName[];
  inputResourcesWithNames: InputResourceWithName[];
};

/**
 * Enriches a PendingRequest with display names for input parameters and resources.
 * This is used for notification messages (e.g., Slack) to show human-readable names
 * instead of just IDs.
 */
export const enrichInputDataForNotification =
  (logger: Logger, catalogConfig: CatalogConfig, approvalFlowConfig: ApprovalFlowConfig) =>
  async (pendingRequest: PendingRequest): Promise<Result<EnrichedInputData, never>> => {
    // Enrich input params with names (pure function, no errors)
    const inputParamsWithNames = enrichInputParamsWithNames(pendingRequest, approvalFlowConfig);

    // Enrich input resources with names
    const inputResourcesWithNames = await enrichInputResourcesWithNames(logger, catalogConfig, pendingRequest);

    return ok({
      inputParamsWithNames,
      inputResourcesWithNames,
    });
  };

/**
 * Enriches input parameters with their display names from the approval flow config.
 * If a param is not found in the config, uses the ID as the name (fallback).
 */
const enrichInputParamsWithNames = (pendingRequest: PendingRequest, approvalFlowConfig: ApprovalFlowConfig): InputParamWithName[] => {
  return pendingRequest.inputParams.map((inputParam) => {
    const inputParamConfig = approvalFlowConfig.inputParams.find((config) => config.id === inputParam.id);
    return {
      id: inputParam.id,
      name: inputParamConfig?.name ?? inputParam.id, // Fallback to ID if name not found
      value: inputParam.value,
    };
  });
};

/**
 * Enriches input resources with their display names by fetching resource info from catalog handler.
 * Resource type names are fetched from catalog config.
 * If a resource is not found, uses the ID as the name (fallback).
 */
const enrichInputResourcesWithNames = async (
  logger: Logger,
  catalogConfig: CatalogConfig,
  pendingRequest: PendingRequest
): Promise<InputResourceWithName[]> => {
  if (pendingRequest.inputResources.length === 0) {
    return [];
  }

  const enrichedResources = await Promise.all(pendingRequest.inputResources.map((inputResource) => enrichSingleResource(logger, catalogConfig, inputResource)));

  return enrichedResources;
};

/**
 * Enriches a single input resource with its display names.
 * Uses the catalog handler to fetch resource information including the name.
 */
const enrichSingleResource = async (
  logger: Logger,
  catalogConfig: CatalogConfig,
  inputResource: { resourceId: string; resourceTypeId: string }
): Promise<InputResourceWithName> => {
  // Find resource type config from catalog config
  const resourceTypeConfig = catalogConfig.resourceTypes.find((rt) => rt.id === inputResource.resourceTypeId);
  const resourceTypeName = resourceTypeConfig?.name ?? inputResource.resourceTypeId;

  // If resource type config is not found, use fallback
  if (!resourceTypeConfig) {
    logger.warn("ResourceTypeConfig not found for enrichment, using ID as names", {
      resourceId: inputResource.resourceId,
      resourceTypeId: inputResource.resourceTypeId,
    });
    return {
      resourceTypeId: inputResource.resourceTypeId,
      resourceTypeName: inputResource.resourceTypeId,
      resourceId: inputResource.resourceId,
      // resourceName is undefined when we can't fetch it
    };
  }

  // Fetch resource info from catalog handler
  const getResourceResult = await resourceTypeConfig.handlers.getResource({
    resourceTypeId: inputResource.resourceTypeId,
    resourceId: inputResource.resourceId,
  });

  if (getResourceResult.isErr()) {
    logger.warn("Failed to fetch resource for enrichment, using ID as name", {
      resourceId: inputResource.resourceId,
      resourceTypeId: inputResource.resourceTypeId,
      error: getResourceResult.error,
    });
    // resourceName is undefined when we can't fetch it
    return {
      resourceTypeId: inputResource.resourceTypeId,
      resourceTypeName,
      resourceId: inputResource.resourceId,
    };
  }

  const resourceOption = getResourceResult.value;

  if (resourceOption.isNone()) {
    logger.warn("Resource not found for enrichment, using ID as name", {
      resourceId: inputResource.resourceId,
      resourceTypeId: inputResource.resourceTypeId,
    });
    // resourceName is undefined when resource not found
    return {
      resourceTypeId: inputResource.resourceTypeId,
      resourceTypeName,
      resourceId: inputResource.resourceId,
    };
  }

  return {
    resourceTypeId: inputResource.resourceTypeId,
    resourceTypeName,
    resourceId: inputResource.resourceId,
    resourceName: resourceOption.value.name,
  };
};
