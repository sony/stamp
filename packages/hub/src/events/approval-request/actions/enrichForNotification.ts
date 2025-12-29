import { ok, err, Result } from "neverthrow";
import { PendingRequest, ApprovalFlowConfig, CatalogConfig, InputParamWithName, InputResourceWithName } from "@stamp-lib/stamp-types/models";
import { Logger } from "@stamp-lib/stamp-logger";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";

// Error types for enrichment operations
export type ResourceFetchError = {
  type: "ResourceFetchError";
  resourceId: string;
  resourceTypeId: string;
  cause: HandlerError;
};

export type EnrichmentError = ResourceFetchError;

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
  async (pendingRequest: PendingRequest): Promise<Result<EnrichedInputData, EnrichmentError>> => {
    // Enrich input params with names (pure function, no errors)
    const inputParamsWithNames = enrichInputParamsWithNames(pendingRequest, approvalFlowConfig);

    // Enrich input resources with names
    const inputResourcesWithNamesResult = await enrichInputResourcesWithNames(logger, catalogConfig, pendingRequest);

    if (inputResourcesWithNamesResult.isErr()) {
      return err(inputResourcesWithNamesResult.error);
    }

    return ok({
      inputParamsWithNames,
      inputResourcesWithNames: inputResourcesWithNamesResult.value,
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
): Promise<Result<InputResourceWithName[], EnrichmentError>> => {
  if (pendingRequest.inputResources.length === 0) {
    return ok([]);
  }

  const enrichmentResults = await Promise.all(pendingRequest.inputResources.map((inputResource) => enrichSingleResource(logger, catalogConfig, inputResource)));

  // Check for errors
  for (const result of enrichmentResults) {
    if (result.isErr()) {
      return err(result.error);
    }
  }

  // All succeeded, extract values
  const enrichedResources = enrichmentResults.map((result) => result._unsafeUnwrap());
  return ok(enrichedResources);
};

/**
 * Enriches a single input resource with its display names.
 * Uses the catalog handler to fetch resource information including the name.
 */
const enrichSingleResource = async (
  logger: Logger,
  catalogConfig: CatalogConfig,
  inputResource: { resourceId: string; resourceTypeId: string }
): Promise<Result<InputResourceWithName, EnrichmentError>> => {
  // Find resource type config from catalog config
  const resourceTypeConfig = catalogConfig.resourceTypes.find((rt) => rt.id === inputResource.resourceTypeId);
  const resourceTypeName = resourceTypeConfig?.name ?? inputResource.resourceTypeId;

  // If resource type config is not found, use fallback
  if (!resourceTypeConfig) {
    logger.warn("ResourceTypeConfig not found for enrichment, using ID as names", {
      resourceId: inputResource.resourceId,
      resourceTypeId: inputResource.resourceTypeId,
    });
    return ok({
      resourceTypeId: inputResource.resourceTypeId,
      resourceTypeName,
      resourceId: inputResource.resourceId,
      resourceName: inputResource.resourceId,
    });
  }

  // Fetch resource info from catalog handler
  const getResourceResult = await resourceTypeConfig.handlers.getResource({
    resourceTypeId: inputResource.resourceTypeId,
    resourceId: inputResource.resourceId,
  });

  if (getResourceResult.isErr()) {
    logger.error("Failed to fetch resource for enrichment", {
      resourceId: inputResource.resourceId,
      resourceTypeId: inputResource.resourceTypeId,
      error: getResourceResult.error,
    });
    return err({
      type: "ResourceFetchError" as const,
      resourceId: inputResource.resourceId,
      resourceTypeId: inputResource.resourceTypeId,
      cause: getResourceResult.error,
    });
  }

  const resourceOption = getResourceResult.value;

  if (resourceOption.isNone()) {
    logger.warn("Resource not found for enrichment, using ID as name", {
      resourceId: inputResource.resourceId,
      resourceTypeId: inputResource.resourceTypeId,
    });
    // Fallback to using ID as name
    return ok({
      resourceTypeId: inputResource.resourceTypeId,
      resourceTypeName,
      resourceId: inputResource.resourceId,
      resourceName: inputResource.resourceId,
    });
  }

  return ok({
    resourceTypeId: inputResource.resourceTypeId,
    resourceTypeName,
    resourceId: inputResource.resourceId,
    resourceName: resourceOption.value.name,
  });
};
