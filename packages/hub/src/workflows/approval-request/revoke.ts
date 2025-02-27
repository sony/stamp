import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ApprovalFlowDBProvider, ApprovalRequestDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider, UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { z } from "zod";
import { StampHubError, convertStampHubError } from "../../error";
import { getApprovalFlowConfig } from "../../events/approval-flow/approvalFlowConfig";
import { revokeApprovalRequest } from "../../events/approval-request/actions/revoke";
import { checkCanRevokeRequestForFlow, checkCanRevokeRequestForResource } from "../../events/approval-request/authz/revoke";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { RevokedActionFailedRequest, RevokedActionSucceededRequest } from "@stamp-lib/stamp-types/models";

export const RevokeWorkflowInput = z.object({ approvalRequestId: z.string(), revokedComment: z.string().max(1024), userIdWhoRevoked: UserId });
export type RevokeWorkflowInput = z.infer<typeof RevokeWorkflowInput>;
export type RevokeWorkflow = (input: RevokeWorkflowInput) => ResultAsync<RevokedActionSucceededRequest | RevokedActionFailedRequest, StampHubError>;

export const revokeWorkflow =
  (
    getCatalogConfigProvider: CatalogConfigProvider["get"],
    approvalRequestDBProvider: ApprovalRequestDBProvider,
    approvalFlowDBProvider: ApprovalFlowDBProvider,
    resourceDBProvider: ResourceDBProvider,
    groupMemberShipProvider: GroupMemberShipProvider
  ): RevokeWorkflow =>
  (input: RevokeWorkflowInput): ResultAsync<RevokedActionSucceededRequest | RevokedActionFailedRequest, StampHubError> => {
    const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);

    return parseZodObjectAsync(input, RevokeWorkflowInput)
      .andThen((parsedInput) => {
        return approvalRequestDBProvider.getById(parsedInput.approvalRequestId).andThen((approvalRequest) => {
          if (approvalRequest.isNone()) {
            return errAsync(new StampHubError("Approval request not found", "Approval Request Not Found", "BAD_REQUEST"));
          } else if (
            !(
              // In past versions of Stamp, approvedHandlerResult was included even in the approved status, so allow it if approvedHandlerResult exists
              (
                (approvalRequest.value.status === "approved" && approvalRequest.value.approvedHandlerResult) ||
                approvalRequest.value.status === "approvedActionSucceeded"
              )
            )
          ) {
            return errAsync(new StampHubError("Approval request is not approved", "Approval Request Not Approved", "BAD_REQUEST"));
          } else {
            return okAsync({ ...parsedInput, ...approvalRequest.value });
          }
        });
      })
      .andThen(getCatalogConfig)
      .andThen(getApprovalFlowConfig)
      .andThen((extendInput) => {
        // get approval flow info
        return approvalFlowDBProvider.getById(extendInput.catalogId, extendInput.approvalFlowId).andThen((approvalFlow) => {
          if (approvalFlow.isNone()) {
            return okAsync({
              ...extendInput,
              approvalFlowInfo: { ...extendInput.approvalFlowConfig, catalogId: extendInput.catalogId },
            });
          } else {
            return okAsync({ ...extendInput, approvalFlowInfo: { ...extendInput.approvalFlowConfig, ...approvalFlow.value } });
          }
        });
      })
      .andThen((extendInput) => {
        // authz
        const approvalFlowConfig = extendInput.approvalFlowConfig;
        if (approvalFlowConfig.approver.approverType === "approvalFlow") {
          return checkCanRevokeRequestForFlow(groupMemberShipProvider.get)(extendInput);
        } else if (approvalFlowConfig.approver.approverType === "resource") {
          const approverResourceTypeId = approvalFlowConfig.approver.resourceTypeId;
          const targetResource = extendInput.inputResources.find((resource) => resource.resourceTypeId === approverResourceTypeId);
          if (targetResource === undefined) {
            // Return Internal server error because nothing approverResourceTypeId is unexpected.
            return errAsync(new StampHubError("Target approverResourceTypeId not found", "Target approverResourceTypeId Not Found", "INTERNAL_SERVER_ERROR"));
          }
          return resourceDBProvider
            .getById({ id: targetResource.resourceId, catalogId: extendInput.catalogId, resourceTypeId: targetResource.resourceTypeId })
            .andThen((resource) => {
              if (resource.isNone()) {
                // Return Internal server error because nothing resource is unexpected.
                return errAsync(new StampHubError("Resource not found", "Resource Not Found", "INTERNAL_SERVER_ERROR"));
              } else {
                return checkCanRevokeRequestForResource(groupMemberShipProvider.get)({ ...extendInput, resourceOnDB: resource.value });
              }
            });
        }
        return errAsync(new StampHubError("ApproverType is not an approvalFlow or resource", "Unexpected error occurred", "INTERNAL_SERVER_ERROR"));
      })
      .andThen((extendInput) => {
        if (!extendInput.approvalFlowInfo.enableRevoke) {
          const errorMessage = `The requested approvalFlow (${extendInput.approvalFlowInfo.name}) does not have revoke action enabled.`;
          return errAsync(new StampHubError(errorMessage, errorMessage, "BAD_REQUEST"));
        } else {
          return okAsync(extendInput);
        }
      })
      .andThen((extendInput) => {
        // Ensure the approved handler is not executed multiple times by updating the status to approved.
        // If status is not pending, return error.
        return approvalRequestDBProvider
          .updateStatusToRevoked({
            catalogId: extendInput.catalogId,
            requestId: extendInput.requestId,
            approvalFlowId: extendInput.approvalFlowId,
            revokedDate: new Date().toISOString(),
            userIdWhoRevoked: extendInput.userIdWhoRevoked,
            revokedComment: extendInput.revokedComment,
          })
          .map((revokedRequest) => {
            return { ...extendInput, ...revokedRequest };
          });
      })
      .andThen((extendRevokedRequest) => {
        return revokeApprovalRequest(extendRevokedRequest.approvalFlowConfig.handlers.revoked, approvalRequestDBProvider.set)(extendRevokedRequest);
      })
      .mapErr(convertStampHubError);
  };
