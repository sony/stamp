import { ResultAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../../error";
import { UpdateResourceParamsWithApprovalInput } from "../input";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { Logger } from "@stamp-lib/stamp-logger";
import type { SubmitWorkflow, SubmitWorkflowInput } from "../../approval-request/submit";
import type { PendingRequest, ValidationFailedRequest } from "@stamp-lib/stamp-types/models";

// =============================================================================
// Type Definitions for Execution Functions
// =============================================================================

// Custom SubmitWorkflow type for the specific usage in resource update approval
export type SubmitWorkflowForResourceUpdate = (params: {
  catalogId: string;
  approvalFlowId: string;
  requestUserId: string;
  inputParams: Array<{ id: string; value: string }>;
  inputResources: Array<unknown>;
  approverType: string;
  approverId: string;
  requestComment: string;
}) => ResultAsync<{ requestId: string; requestDate: string }, unknown>;

// route層の submitWorkflow をワークフロー用に変換するアダプタ
export const adaptSubmitWorkflow =
  (submitWorkflow: SubmitWorkflow): SubmitWorkflowForResourceUpdate =>
  (params) =>
    submitWorkflow({
      catalogId: params.catalogId,
      approvalFlowId: params.approvalFlowId,
      requestUserId: params.requestUserId,
      inputParams: params.inputParams,
      inputResources: params.inputResources as { resourceTypeId: string; resourceId: string }[],
      approverType: "group", // ApproverTypeはoptionalなので"group"を明示
      approverId: params.approverId,
      requestComment: params.requestComment,
    } as SubmitWorkflowInput).map((result: PendingRequest | ValidationFailedRequest) => ({
      requestId: result.requestId,
      requestDate: result.requestDate,
    }));

// =============================================================================
// Side Effect Execution Functions
// =============================================================================

/**
 * Creates a function to submit approval workflow
 * Side effect function that handles external API calls
 */
export const createSubmitApprovalWorkflow =
  (submitWorkflow: SubmitWorkflowForResourceUpdate) =>
  (approverGroupId: string, input: UpdateResourceParamsWithApprovalInput): ResultAsync<{ requestId: string; requestDate: string }, StampHubError> => {
    return submitWorkflow({
      catalogId: "stamp-system", // Use built-in catalog
      approvalFlowId: "resource-update", // Use built-in ApprovalFlow
      requestUserId: input.requestUserId,
      inputParams: [
        {
          id: "catalogId",
          value: input.catalogId,
        },
        {
          id: "resourceTypeId",
          value: input.resourceTypeId,
        },
        {
          id: "resourceId",
          value: input.resourceId,
        },
        {
          id: "updateParams",
          value: JSON.stringify(input.updateParams),
        },
      ],
      inputResources: [],
      approverType: "group",
      approverId: approverGroupId,
      requestComment: input.comment ?? "",
    }).mapErr((error: unknown) => {
      if (error instanceof StampHubError) {
        return error;
      }
      return new StampHubError("Failed to submit approval workflow", "Internal server error", "INTERNAL_SERVER_ERROR");
    });
  };

/**
 * Creates a function to update resource pending parameters
 * Side effect function that handles database operations and logging
 */
export const createUpdateResourcePendingParams =
  (resourceDBProvider: ResourceDBProvider, logger: Logger) =>
  (
    input: UpdateResourceParamsWithApprovalInput,
    approvalRequest: { requestId: string; requestDate: string }
  ): ResultAsync<{ approvalRequestId: string }, StampHubError> => {
    logger.info(`Approval request created with ID: ${approvalRequest.requestId}`);

    return resourceDBProvider
      .updatePendingUpdateParams({
        id: input.resourceId,
        catalogId: input.catalogId,
        resourceTypeId: input.resourceTypeId,
        pendingUpdateParams: {
          approvalRequestId: approvalRequest.requestId,
          updateParams: input.updateParams,
          requestUserId: input.requestUserId,
          requestedAt: approvalRequest.requestDate,
        },
      })
      .map(() => ({ approvalRequestId: approvalRequest.requestId }))
      .mapErr((error: unknown) => {
        logger.error(`Failed to update pending update params: ${error}`);
        if (error instanceof Error || error instanceof StampHubError) {
          return convertStampHubError(error);
        }
        return new StampHubError("Failed to update pending update params", "Internal server error", "INTERNAL_SERVER_ERROR");
      });
  };

/**
 * Creates a comprehensive execution pipeline
 * Combines workflow submission and database update with error handling
 */
export const createExecuteApprovalWorkflow =
  (submitWorkflow: SubmitWorkflowForResourceUpdate, resourceDBProvider: ResourceDBProvider, logger: Logger) =>
  (approverGroupId: string, input: UpdateResourceParamsWithApprovalInput): ResultAsync<{ approvalRequestId: string }, StampHubError> => {
    const submitWorkflowFunc = createSubmitApprovalWorkflow(submitWorkflow);
    const updatePendingParamsFunc = createUpdateResourcePendingParams(resourceDBProvider, logger);

    return submitWorkflowFunc(approverGroupId, input)
      .andThen((approvalRequest) => updatePendingParamsFunc(input, approvalRequest))
      .mapErr((error) => {
        logger.error(`Failed to execute approval workflow: ${error.message}`);
        return error;
      });
  };
