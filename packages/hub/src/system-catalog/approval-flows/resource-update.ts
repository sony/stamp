import {
  ApprovalRequestValidationInput,
  ApprovalRequestValidationOutput,
  ApprovedInput,
  ApprovedOutput,
  HandlerError,
} from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { okAsync, errAsync, Result } from "neverthrow";
import { z } from "zod";
import { createStampHubLogger } from "../../logger";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { convertPromiseResultToResultAsync } from "../../utils/neverthrow";

export interface ResourceUpdateValidationHandlerDependencies {
  resourceDBProvider: ResourceDBProvider;
  catalogConfigProvider: CatalogConfigProvider;
}
const ResourceUpdateApprovalHandlerInput = z.object({
  catalogId: z.string(),
  catalogName: z.string(),
  resourceTypeName: z.string(),
  resourceTypeId: z.string(),
  resourceId: z.string(),
  resourceName: z.string(),
  updateParams: z.string(),
});

/**
 * Resource update validation handler
 * Validates the validity of resource update requests
 */
export const validateResourceUpdateRequest =
  (dependencies: ResourceUpdateValidationHandlerDependencies) =>
  async (input: ApprovalRequestValidationInput): Promise<Result<ApprovalRequestValidationOutput, HandlerError>> => {
    const { resourceDBProvider } = dependencies;
    const logger = createStampHubLogger();

    const handlerInput = ResourceUpdateApprovalHandlerInput.safeParse(input.inputParams);

    if (!handlerInput.success) {
      return errAsync(new HandlerError(`Invalid input parameters: ${handlerInput.error.message}`, "INTERNAL_SERVER_ERROR"));
    }
    const { resourceId, resourceName, resourceTypeId, resourceTypeName, catalogName, catalogId, updateParams } = handlerInput.data;

    logger.info("Validating resource update request", {
      resourceId,
      resourceName,
      resourceTypeId,
      resourceTypeName,
      catalogName,
      catalogId,
      updateParams,
    });

    // Check resource existence
    return resourceDBProvider
      .getById({
        id: resourceId,
        catalogId,
        resourceTypeId,
      })
      .mapErr((error) => new HandlerError(`Failed to get resource for validation: ${error.message}`, "INTERNAL_SERVER_ERROR"))
      .andThen((resourceOpt) => {
        if (resourceOpt.isNone()) {
          logger.error("Resource not found during validation", {
            resourceId,
            resourceTypeId,
            catalogId,
          });
          return okAsync({
            isSuccess: false,
            message: `Resource ${resourceId} not found`,
          });
        }

        const result: ApprovalRequestValidationOutput = {
          isSuccess: true,
          message: `This is resource update request. Catalog: ${catalogName} (${catalogId}) , Resource type : ${resourceTypeName} (${resourceTypeId} ) , Resource : ${resourceName} ${resourceId}`,
        };

        return okAsync(result);
      });
  };

/**
 * Resource update approval handler
 * Executes the approved resource update request
 */
export const executeResourceUpdateApproval =
  (dependencies: ResourceUpdateValidationHandlerDependencies) =>
  async (input: ApprovedInput): Promise<Result<ApprovedOutput, HandlerError>> => {
    const { catalogConfigProvider, resourceDBProvider } = dependencies;
    const logger = createStampHubLogger();
    const getCatalogConfig = createGetCatalogConfig(catalogConfigProvider.get);

    const handlerInput = ResourceUpdateApprovalHandlerInput.safeParse(input.inputParams);

    if (!handlerInput.success) {
      return errAsync(new HandlerError(`Invalid input parameters: ${handlerInput.error.message}`, "INTERNAL_SERVER_ERROR"));
    }
    const { resourceId, resourceTypeId, catalogId, updateParams } = handlerInput.data;

    logger.info("Executing resource update approval", {
      resourceId,
      resourceTypeId,
      catalogId,
      requestId: input.requestId,
    });
    // Get resource
    return getCatalogConfig({
      catalogId: catalogId,
      resourceTypeId: resourceTypeId,
    })
      .andThen(getResourceTypeConfig)
      .andThen((extendInput) => {
        return convertPromiseResultToResultAsync()(
          extendInput.resourceTypeConfig.handlers.updateResource({
            resourceId: resourceId,
            updateParams: JSON.parse(updateParams), // Assuming updateParams is a JSON string
            resourceTypeId: resourceTypeId,
          })
        );
      })
      .andThen((result) => {
        logger.info("Resource update executed successfully", result);
        logger.info("Approval request canceled successfully");
        return resourceDBProvider.updatePendingUpdateParams({
          catalogId: catalogId,
          resourceTypeId: resourceTypeId,
          id: resourceId,
          pendingUpdateParams: undefined, // Clear pending update params
        });
      })
      .andThen(() => {
        const approvedOutput: ApprovedOutput = {
          message: "Resource update approved and executed successfully",
          isSuccess: true,
        };
        return okAsync(approvedOutput);
      })
      .mapErr((error) => {
        logger.error("Error executing resource update approval", error);
        return new HandlerError(`Failed to execute resource update approval: ${error.message}`, "INTERNAL_SERVER_ERROR");
      });
  };
