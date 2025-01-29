import { StampHubError, convertStampHubError } from "../../error";
import { ApprovalFlowDBProvider, ApprovalRequestDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { z } from "zod";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { okAsync, errAsync, ResultAsync } from "neverthrow";
import { GroupMemberShipProvider, UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";

import { createRejectApprovalRequest } from "../../events/approval-request/actions/reject";

import { RejectedRequest } from "@stamp-lib/stamp-types/models";
import { checkCanRejectRequestForResource, checkCanRejectRequestForFlow } from "../../events/approval-request/authz/reject";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { getApprovalFlowConfig } from "../../events/approval-flow/approvalFlowConfig";

export const RejectWorkflowInput = z.object({ approvalRequestId: z.string(), rejectComment: z.string().max(1024), userIdWhoRejected: UserId });
export type RejectWorkflowInput = z.infer<typeof RejectWorkflowInput>;

export const rejectWorkflow =
  (providers: {
    getCatalogConfigProvider: CatalogConfigProvider["get"];
    getApprovalRequestById: ApprovalRequestDBProvider["getById"];
    updateApprovalRequestStatusToRejected: ApprovalRequestDBProvider["updateStatusToRejected"];
    getApprovalFlowById: ApprovalFlowDBProvider["getById"];
    getResourceById: ResourceDBProvider["getById"];
    getGroupMemberShip: GroupMemberShipProvider["get"];
  }) =>
  (input: RejectWorkflowInput): ResultAsync<RejectedRequest, StampHubError> => {
    const {
      getCatalogConfigProvider,
      getApprovalRequestById,
      updateApprovalRequestStatusToRejected,
      getApprovalFlowById,
      getResourceById,
      getGroupMemberShip,
    } = providers;
    const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);

    return parseZodObjectAsync(input, RejectWorkflowInput)
      .andThen((parsedInput) => {
        return getApprovalRequestById(parsedInput.approvalRequestId).andThen((approvalRequest) => {
          if (approvalRequest.isNone()) {
            return errAsync(new StampHubError("Approval request not found", "Approval Request Not Found", "BAD_REQUEST"));
          } else if (approvalRequest.value.status !== "pending") {
            return errAsync(
              new StampHubError(
                `Approval request is not pending. Current status is ${approvalRequest.value.status}`,
                `This approval request has already been approved or rejected. Current status is ${approvalRequest.value.status}`,
                "BAD_REQUEST"
              )
            );
          } else {
            return okAsync({ ...parsedInput, ...approvalRequest.value });
          }
        });
      })
      .andThen(getCatalogConfig)
      .andThen(getApprovalFlowConfig)
      .andThen((extendApprovalRequest) => {
        // get approval flow info
        return getApprovalFlowById(extendApprovalRequest.catalogId, extendApprovalRequest.approvalFlowId).andThen((approvalFlow) => {
          if (approvalFlow.isNone()) {
            return okAsync({
              ...extendApprovalRequest,
              approvalFlowInfo: { ...extendApprovalRequest.approvalFlowConfig, catalogId: extendApprovalRequest.catalogId },
            });
          } else {
            return okAsync({ ...extendApprovalRequest, approvalFlowInfo: { ...extendApprovalRequest.approvalFlowConfig, ...approvalFlow.value } });
          }
        });
      })
      .andThen((extendApprovalRequest) => {
        // authz
        const approvalFlowConfig = extendApprovalRequest.approvalFlowConfig;
        if (approvalFlowConfig.approver.approverType === "approvalFlow") {
          return checkCanRejectRequestForFlow(getGroupMemberShip)(extendApprovalRequest);
        } else if (approvalFlowConfig.approver.approverType === "resource") {
          const approverResourceTypeId = approvalFlowConfig.approver.resourceTypeId;
          const targetResource = extendApprovalRequest.inputResources.find((resource) => resource.resourceTypeId === approverResourceTypeId);
          if (targetResource === undefined) {
            // Return Internal server error because nothing approverResourceTypeId is unexpected.
            return errAsync(new StampHubError("Target approverResourceTypeId not found", "Target approverResourceTypeId Not Found", "INTERNAL_SERVER_ERROR"));
          }
          return getResourceById({
            id: targetResource.resourceId,
            catalogId: extendApprovalRequest.catalogId,
            resourceTypeId: targetResource.resourceTypeId,
          }).andThen((resource) => {
            if (resource.isNone()) {
              // Return Internal server error because nothing resource is unexpected.
              return errAsync(new StampHubError("Resource not found", "Resource Not Found", "INTERNAL_SERVER_ERROR"));
            } else {
              return checkCanRejectRequestForResource(getGroupMemberShip)({ ...extendApprovalRequest, resourceOnDB: resource.value });
            }
          });
        } else {
          // Return Internal server error because approverType is only approvalFlow or resource.
          return errAsync(new StampHubError("Approver type not found", "Approver Type Not Found", "INTERNAL_SERVER_ERROR"));
        }
      })
      .andThen((extendApprovalRequest) => {
        return createRejectApprovalRequest(updateApprovalRequestStatusToRejected)(extendApprovalRequest);
      })
      .mapErr(convertStampHubError);
  };
