import {
  ApprovalRequestValidationInput,
  ApprovalRequestValidationOutput,
  ApprovedInput,
  ApprovedOutput,
  HandlerError,
} from "@stamp-lib/stamp-types/catalogInterface/handler";
import { DBError, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { okAsync, errAsync, Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import { createStampHubLogger } from "../../logger";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { convertPromiseResultToResultAsync } from "../../utils/neverthrow";
import { GetResourceInfo, getResourceInfo } from "../../workflows/resource/getResourceInfo";
import { Logger } from "@stamp-lib/stamp-logger";
import { StampHubError } from "../../error";

export interface ResourceUpdateValidationHandlerDependencies {
  getCatalogConfig: ReturnType<typeof createGetCatalogConfig>;
  checkCanApproveResourceUpdate: CheckCanApproveResourceUpdate;
}

export interface ResourceUpdateApprovalHandlerDependencies {
  getCatalogConfig: ReturnType<typeof createGetCatalogConfig>;
  checkCanApproveResourceUpdate: CheckCanApproveResourceUpdate;
  updatePendingUpdateParams: ResourceDBProvider["updatePendingUpdateParams"];
  errorHandling: ErrorHandlingForCancelUpdateResourceParamsWithApproval;
  logger: Logger;
}

export type CheckCanApproveResourceUpdate = <
  T extends {
    catalogId: string;
    resourceTypeId: string;
    resourceId: string;
    requestUserId: string;
    approverGroupId: string;
  }
>(
  input: T
) => ResultAsync<T, HandlerError>;

/**
 * Factory function to create checkCanApproveResourceUpdate dependency
 */
export const createCheckCanApproveResourceUpdate = (
  catalogConfigProvider: CatalogConfigProvider,
  resourceDBProvider: ResourceDBProvider
): CheckCanApproveResourceUpdate => {
  return checkCanApproveResourceUpdate({
    getResourceInfo: getResourceInfo({
      getCatalogConfigProvider: catalogConfigProvider.get,
      getResourceDBProvider: resourceDBProvider.getById,
    }),
    logger: createStampHubLogger(),
  });
};

const ResourceUpdateApprovalHandlerInput = z.object({
  catalogId: z.object({
    id: z.string(),
    value: z.string(),
  }),
  resourceTypeId: z.object({
    id: z.string(),
    value: z.string(),
  }),
  resourceId: z.object({
    id: z.string(),
    value: z.string(),
  }),
  updateParams: z.object({
    id: z.string(),
    value: z.string(), // Assuming updateParams is a JSON string
  }),
});

/**
 * Resource update validation handler
 * Validates the validity of resource update requests
 */
export const validateResourceUpdateRequest =
  (dependencies: ResourceUpdateValidationHandlerDependencies) =>
  async (input: ApprovalRequestValidationInput): Promise<Result<ApprovalRequestValidationOutput, HandlerError>> => {
    const { getCatalogConfig, checkCanApproveResourceUpdate } = dependencies;
    const logger = createStampHubLogger();

    const handlerInput = ResourceUpdateApprovalHandlerInput.safeParse(input.inputParams);

    if (!handlerInput.success) {
      return errAsync(new HandlerError(`Invalid input parameters: ${handlerInput.error.message}`, "INTERNAL_SERVER_ERROR"));
    }
    const { resourceId, resourceTypeId, catalogId } = handlerInput.data;

    logger.info("Validating resource update request", handlerInput.data);

    return checkCanApproveResourceUpdate({
      catalogId: catalogId.value,
      resourceTypeId: resourceTypeId.value,
      resourceId: resourceId.value,
      requestUserId: input.requestUserId,
      approverGroupId: input.approverId, // Currently approver ID is a group ID
    })
      .andThen(() => {
        return getCatalogConfig({
          catalogId: catalogId.value,
          resourceTypeId: resourceTypeId.value,
        });
      })
      .andThen(getResourceTypeConfig)
      .andThen((extendInput) => {
        return convertPromiseResultToResultAsync()(
          extendInput.resourceTypeConfig.handlers.getResource({
            resourceId: resourceId.value,
            resourceTypeId: resourceTypeId.value,
          })
        );
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
          message: `This is resource update request. Catalog: ${catalogId.value} , Resource type : ${resourceTypeId.value}  , Resource : ${resourceId.value}`,
        };

        return okAsync(result);
      });
  };

/**
 * Resource update approval handler
 * Executes the approved resource update request
 */
export const executeResourceUpdateApproval =
  (dependencies: ResourceUpdateApprovalHandlerDependencies) =>
  async (input: ApprovedInput): Promise<Result<ApprovedOutput, HandlerError>> => {
    const { getCatalogConfig, checkCanApproveResourceUpdate, updatePendingUpdateParams, logger } = dependencies;

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

    return checkCanApproveResourceUpdate({
      catalogId: catalogId.value,
      resourceTypeId: resourceTypeId.value,
      resourceId: resourceId.value,
      requestUserId: input.requestUserId,
      approverGroupId: input.approverId, // Currently approver ID is a group ID
    })
      .andThen(() => {
        return getCatalogConfig({
          catalogId: catalogId.value,
          resourceTypeId: resourceTypeId.value,
        });
      })
      .andThen(getResourceTypeConfig)
      .andThen((extendInput) => {
        return convertPromiseResultToResultAsync()(
          extendInput.resourceTypeConfig.handlers.updateResource({
            resourceId: resourceId.value,
            updateParams: JSON.parse(updateParams.value), // Assuming updateParams is a JSON string
            resourceTypeId: resourceTypeId.value,
          })
        ).mapErr((error) => {
          logger.error("Error from updateResource handler", {
            error: error.message,
            errorType: error.constructor.name,
            resourceId: resourceId.value,
            resourceTypeId: resourceTypeId.value,
          });
          return error;
        });
      })
      .andThen((result) => {
        logger.info("Resource update executed successfully", result);
        return updatePendingUpdateParams({
          catalogId: catalogId.value,
          resourceTypeId: resourceTypeId.value,
          id: resourceId.value,
          pendingUpdateParams: undefined, // Clear pending update params
        });
      })
      .andThen(() => {
        const approvedOutput: ApprovedOutput = {
          message: "Resource update executed successfully",
          isSuccess: true,
        };
        return okAsync(approvedOutput);
      })
      .orElse((error) => {
        return dependencies.errorHandling({
          error,
          catalogId: catalogId.value,
          resourceTypeId: resourceTypeId.value,
          resourceId: resourceId.value,
        });
      });
  };

export type ErrorHandlingForCancelUpdateResourceParamsWithApproval = (input: {
  error: HandlerError | StampHubError | DBError;
  catalogId: string;
  resourceTypeId: string;
  resourceId: string;
}) => ResultAsync<ApprovedOutput, never>;

export const errorHandlingForCancelUpdateResourceParamsWithApproval =
  (providers: {
    logger: Logger;
    updatePendingUpdateParams: ResourceDBProvider["updatePendingUpdateParams"];
  }): ErrorHandlingForCancelUpdateResourceParamsWithApproval =>
  (input) => {
    const { logger, updatePendingUpdateParams } = providers;
    logger.error("Error executing resource update approval", {
      error: input.error.message,
      errorType: input.error.constructor.name,
      isHandlerError: input.error instanceof HandlerError,
      errorCode: input.error instanceof HandlerError ? input.error.code : undefined,
    });
    return updatePendingUpdateParams({
      catalogId: input.catalogId,
      resourceTypeId: input.resourceTypeId,
      id: input.resourceId,
      pendingUpdateParams: undefined, // Clear pending update params
    })
      .andThen(() => {
        const errorResponse = {
          message: `Failed to execute resource update approval: ${input.error.message}`,
          isSuccess: false,
        };
        logger.info("Returning error response", errorResponse);
        return okAsync(errorResponse);
      })
      .orElse((error) => {
        logger.error("Error clearing pending update params", {
          error: error.message,
          errorType: error.constructor.name,
        });
        return okAsync({
          message: `Failed to execute resource update approval: ${input.error.message}. Also failed to reset the update status for the resource.`,
          isSuccess: false,
        });
      });
  };

export const checkCanApproveResourceUpdate =
  (providers: { getResourceInfo: GetResourceInfo; logger: Logger }) =>
  <T extends { catalogId: string; resourceTypeId: string; resourceId: string; requestUserId: string; approverGroupId: string }>(
    input: T
  ): ResultAsync<T, HandlerError> => {
    const { getResourceInfo, logger } = providers;
    logger.info("Checking if resource update can be approved", input);

    return getResourceInfo(input)
      .andThen((resourceInfoOpt) => {
        if (resourceInfoOpt.isNone()) {
          logger.warn("Resource not found", input);
          return errAsync(new HandlerError("Parent Resource not found", "BAD_REQUEST"));
        }
        return getResourceInfo({
          catalogId: input.catalogId,
          resourceTypeId: resourceInfoOpt.value.parentResourceTypeId ?? "",
          resourceId: resourceInfoOpt.value.parentResourceId ?? "",
          requestUserId: input.requestUserId,
        });
      })
      .andThen((parentResourceOpt) => {
        if (parentResourceOpt.isNone()) {
          logger.warn("Resource not found", input);
          return errAsync(new HandlerError("Resource not found", "BAD_REQUEST"));
        }
        if (!parentResourceOpt.value.approverGroupId) {
          logger.warn("Parent resource does not have an approver group", input);
          return errAsync(new HandlerError("Parent resource does not have an approver group", "BAD_REQUEST"));
        }
        if (parentResourceOpt.value.approverGroupId !== input.approverGroupId) {
          logger.info("Approver group does not match parent resource's approver group", input);
          return errAsync(new HandlerError("Approver group does not match parent resource's approver group", "BAD_REQUEST"));
        }

        return okAsync({
          ...input,
        });
      })
      .mapErr((error) => {
        if (error instanceof HandlerError) {
          return error;
        }
        return new HandlerError(`Failed to check if resource update can be approved: ${error.message}`, "INTERNAL_SERVER_ERROR");
      });
  };
