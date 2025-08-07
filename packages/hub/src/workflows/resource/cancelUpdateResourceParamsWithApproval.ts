import { CancelUpdateResourceParamsWithApprovalInput } from "./input";

import { ResourceDBProvider, ApprovalRequestDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { cancelApprovalRequest } from "../../events/approval-request/actions/cancel";
import { Logger } from "@stamp-lib/stamp-logger";
import { errAsync, ResultAsync } from "neverthrow";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObject } from "../../utils/neverthrow";

import { CheckCanEditResource } from "../../events/resource/authz/canEditResource";

export const cancelUpdateResourceParamsWithApproval =
  (providers: {
    resourceDBProvider: ResourceDBProvider;
    approvalRequestDBProvider: ApprovalRequestDBProvider;
    logger: Logger;
    checkCanEditResource: CheckCanEditResource;
  }) =>
  (input: CancelUpdateResourceParamsWithApprovalInput): ResultAsync<undefined, StampHubError> => {
    const { resourceDBProvider, approvalRequestDBProvider, checkCanEditResource, logger } = providers;

    const parsedInput = parseZodObject(input, CancelUpdateResourceParamsWithApprovalInput);

    logger.info("Canceling update resource with approval");
    if (parsedInput.isErr()) {
      return errAsync(new StampHubError("Invalid input", "Invalid Input", "BAD_REQUEST"));
    }
    logger.info("Parsed input for cancel update resource with approval", parsedInput.value);
    input = parsedInput.value;

    return checkCanEditResource(input)
      .andThen(() => {
        logger.info("Fetching resource to cancel update with approval", {
          catalogId: input.catalogId,
          resourceTypeId: input.resourceTypeId,
          resourceId: input.resourceId,
          requestUserId: input.requestUserId,
        });
        return resourceDBProvider.getById({
          id: input.resourceId,
          catalogId: input.catalogId,
          resourceTypeId: input.resourceTypeId,
        });
      })
      .andThen((resourceOpt) => {
        logger.info("Fetched resource for cancel update with approval", JSON.stringify(resourceOpt));
        if (resourceOpt.isNone()) {
          return errAsync(new StampHubError("Resource not found", "Resource Not Found", "NOT_FOUND"));
        }
        const resource = resourceOpt.value;
        if (!resource.pendingUpdateParams) {
          return errAsync(new StampHubError("No matching pending update for this resource", "No Matching Pending Update", "BAD_REQUEST"));
        }
        const pendingUpdateParams = resource.pendingUpdateParams; // Store for type safety
        // Fetch approval request and validate it exists and is pending first
        return approvalRequestDBProvider.getById(pendingUpdateParams.approvalRequestId).andThen((approvalOpt) => {
          if (approvalOpt.isNone()) {
            return errAsync(new StampHubError("Approval request not found", "Approval Request Not Found", "NOT_FOUND"));
          }
          const approval = approvalOpt.value;
          // Check if the approval request matches the pending update
          if (approval.status === "pending") {
            // Mark approval request as canceled
            return cancelApprovalRequest(approvalRequestDBProvider.updateStatusToCanceled)({
              catalogId: input.catalogId,
              approvalFlowId: approval.approvalFlowId,
              requestId: pendingUpdateParams.approvalRequestId,
              canceledDate: new Date().toISOString(),
              userIdWhoCanceled: "system",
              cancelComment: "Cancelled by requester",
            }).andThen(() => {
              logger.info("Approval request canceled successfully");
              return resourceDBProvider.updatePendingUpdateParams({
                catalogId: input.catalogId,
                resourceTypeId: input.resourceTypeId,
                id: input.resourceId,
                pendingUpdateParams: undefined, // Clear pending update params
              });
            });
          } else if (approval.status === "approvedActionFailed" || approval.status === "rejected") {
            // If the approval request is already approved with action failed or rejected, we clear the pending update params
            logger.info("Approval request is already approved with action failed or rejected, clearing pending update params");
            return resourceDBProvider.updatePendingUpdateParams({
              catalogId: input.catalogId,
              resourceTypeId: input.resourceTypeId,
              id: input.resourceId,
              pendingUpdateParams: undefined, // Clear pending update params
            });
          } else {
            logger.warn("Approval request is not pending or approvedActionFailed or rejected, cannot cancel update", {
              approvalStatus: approval.status,
              catalogId: input.catalogId,
              resourceTypeId: input.resourceTypeId,
              resourceId: input.resourceId,
            });
            return errAsync(
              new StampHubError(
                "Approval request is not pending or approvedActionFailed or rejected",
                "Approval request is not pending or approvedActionFailed or rejected",
                "BAD_REQUEST"
              )
            );
          }
        });
      })
      .map(() => {
        logger.info("Successfully canceled update resource with approval", {
          catalogId: input.catalogId,
          resourceTypeId: input.resourceTypeId,
          resourceId: input.resourceId,
          requestUserId: input.requestUserId,
        });
        return undefined;
      })
      .mapErr((e) => {
        logger.error("Error canceling update resource with approval", e);
        return convertStampHubError(e);
      });
  };
