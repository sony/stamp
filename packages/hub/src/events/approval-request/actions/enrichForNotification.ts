import { ResultAsync, okAsync } from "neverthrow";
import { PendingRequest, ApprovalFlowConfig, CatalogConfig, InputParamWithName, InputResourceWithName } from "@stamp-lib/stamp-types/models";
import { Logger } from "@stamp-lib/stamp-logger";
import { StampHubError, convertStampHubError } from "../../../error";
import { convertPromiseResultToResultAsync } from "../../../utils/neverthrow";

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
  (pendingRequest: PendingRequest): ResultAsync<EnrichedInputData, StampHubError> => {
    // Enrich input params with names
    const inputParamsWithNames = enrichInputParamsWithNames(pendingRequest, approvalFlowConfig);

    // Enrich input resources with names
    return enrichInputResourcesWithNames(
      logger,
      catalogConfig
    )(pendingRequest).map((inputResourcesWithNames) => ({
      inputParamsWithNames,
      inputResourcesWithNames,
    }));
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
const enrichInputResourcesWithNames =
  (logger: Logger, catalogConfig: CatalogConfig) =>
  (pendingRequest: PendingRequest): ResultAsync<InputResourceWithName[], StampHubError> => {
    const enrichmentTasks = pendingRequest.inputResources.map((inputResource) => enrichSingleResource(logger, catalogConfig)(inputResource));

    if (enrichmentTasks.length === 0) {
      return okAsync([]);
    }

    return ResultAsync.combine(enrichmentTasks);
  };

/**
 * Enriches a single input resource with its display names.
 * Uses the catalog handler to fetch resource information including the name.
 */
const enrichSingleResource =
  (logger: Logger, catalogConfig: CatalogConfig) =>
  (inputResource: { resourceId: string; resourceTypeId: string }): ResultAsync<InputResourceWithName, StampHubError> => {
    // Find resource type config from catalog config
    const resourceTypeConfig = catalogConfig.resourceTypes.find((rt) => rt.id === inputResource.resourceTypeId);
    const resourceTypeName = resourceTypeConfig?.name ?? inputResource.resourceTypeId;

    // If resource type config is not found, use fallback
    if (!resourceTypeConfig) {
      logger.warn("ResourceTypeConfig not found for enrichment, using ID as names", {
        resourceId: inputResource.resourceId,
        resourceTypeId: inputResource.resourceTypeId,
      });
      return okAsync({
        resourceTypeId: inputResource.resourceTypeId,
        resourceTypeName,
        resourceId: inputResource.resourceId,
        resourceName: inputResource.resourceId,
      });
    }

    // Fetch resource info from catalog handler
    return convertPromiseResultToResultAsync()(
      resourceTypeConfig.handlers.getResource({
        resourceTypeId: inputResource.resourceTypeId,
        resourceId: inputResource.resourceId,
      })
    )
      .andThen((resourceOption) => {
        if (resourceOption.isNone()) {
          logger.warn("Resource not found for enrichment, using ID as name", {
            resourceId: inputResource.resourceId,
            resourceTypeId: inputResource.resourceTypeId,
          });
          // Fallback to using ID as name
          return okAsync({
            resourceTypeId: inputResource.resourceTypeId,
            resourceTypeName,
            resourceId: inputResource.resourceId,
            resourceName: inputResource.resourceId,
          });
        }

        return okAsync({
          resourceTypeId: inputResource.resourceTypeId,
          resourceTypeName,
          resourceId: inputResource.resourceId,
          resourceName: resourceOption.value.name,
        });
      })
      .mapErr(convertStampHubError);
  };
