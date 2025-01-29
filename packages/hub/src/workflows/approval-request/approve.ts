import { StampHubError, convertStampHubError } from "../../error";
import { ApprovalRequestDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { z } from "zod";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { okAsync, errAsync } from "neverthrow";
import { UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { ApprovalFlowDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { executeApprovedAction } from "../../events/approval-request/actions/approve";
import { getApprovalFlowConfig } from "../../events/approval-flow/approvalFlowConfig";
import { checkCanApproveRequestForFlow, checkCanApproveRequestForResource } from "../../events/approval-request/authz/approve";

export const ApproveWorkflowInput = z.object({ approvalRequestId: z.string(), approvedComment: z.string().max(1024), userIdWhoApproved: UserId });
export type ApproveWorkflowInput = z.infer<typeof ApproveWorkflowInput>;

export const approveWorkflow =
  (providers: {
    getCatalogConfigProvider: CatalogConfigProvider["get"];
    getApprovalRequestById: ApprovalRequestDBProvider["getById"];
    updateApprovalRequestStatusToApproved: ApprovalRequestDBProvider["updateStatusToApproved"];
    setApprovalRequest: ApprovalRequestDBProvider["set"];
    getApprovalFlowById: ApprovalFlowDBProvider["getById"];
    getResourceById: ResourceDBProvider["getById"];
    getGroupMemberShip: GroupMemberShipProvider["get"];
  }) =>
  (input: ApproveWorkflowInput) => {
    const {
      getCatalogConfigProvider,
      getApprovalRequestById,
      updateApprovalRequestStatusToApproved,
      setApprovalRequest,
      getApprovalFlowById,
      getResourceById,
      getGroupMemberShip,
    } = providers;
    const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);

    return parseZodObjectAsync(input, ApproveWorkflowInput)
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
          return checkCanApproveRequestForFlow(getGroupMemberShip)(extendApprovalRequest);
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
              return checkCanApproveRequestForResource(getGroupMemberShip)({ ...extendApprovalRequest, resourceOnDB: resource.value });
            }
          });
        } else {
          // Return Internal server error because approverType is only approvalFlow or resource.
          return errAsync(new StampHubError("Approver type not found", "Approver Type Not Found", "INTERNAL_SERVER_ERROR"));
        }
      })
      .andThen((extendApprovalRequest) => {
        // Ensure the approved handler is not executed multiple times by updating the status to approved.
        // If status is not pending, return error.
        return updateApprovalRequestStatusToApproved({
          catalogId: extendApprovalRequest.catalogId,
          requestId: extendApprovalRequest.requestId,
          approvalFlowId: extendApprovalRequest.approvalFlowId,
          approvedDate: new Date().toISOString(),
          userIdWhoApproved: extendApprovalRequest.userIdWhoApproved,
          approvedComment: extendApprovalRequest.approvedComment,
        }).map((approvedRequest) => {
          return { ...extendApprovalRequest, ...approvedRequest };
        });
      })
      .andThen((extendApprovedRequest) => {
        return executeApprovedAction(extendApprovedRequest.approvalFlowConfig.handlers.approved, setApprovalRequest)(extendApprovedRequest);
      })
      .mapErr(convertStampHubError);
  };
