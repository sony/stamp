import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ApprovalFlowInfo, ResourceOnDB, PendingRequest } from "@stamp-lib/stamp-types/models";
import { convertStampHubError, StampHubError } from "../../../error";
import { parseZodObjectAsync } from "../../../utils/neverthrow";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { z } from "zod";
import { ApproveApprovalRequestInput } from "../../../inputAuthzModel";

// Check if user can approve the approval request that approverType is approval flow
export const CheckCanApproveRequestForFlowInput = ApproveApprovalRequestInput.extend({ approvalFlowInfo: ApprovalFlowInfo });
export type CheckCanApproveRequestForFlowInput = z.infer<typeof CheckCanApproveRequestForFlowInput>;

export type CheckCanApproveRequestForFlow = <T extends CheckCanApproveRequestForFlowInput>(input: T) => ResultAsync<T, StampHubError>;

// Check if user can approve the approval request that approverType is resource
export const CheckCanApproveRequestForResourceInput = ApproveApprovalRequestInput.extend({ approvalFlowInfo: ApprovalFlowInfo, resourceOnDB: ResourceOnDB });
export type CheckCanApproveRequestForResourceInput = z.infer<typeof CheckCanApproveRequestForResourceInput>;

export type CheckCanApproveRequestForResource = <T extends CheckCanApproveRequestForResourceInput>(input: T) => ResultAsync<T, StampHubError>;

// Check if user can approve the approval request that approverType is requestSpecified
export const CheckCanApproveRequestForRequestSpecifiedInput = ApproveApprovalRequestInput.extend({
  approvalFlowInfo: ApprovalFlowInfo,
  request: PendingRequest,
});
export type CheckCanApproveRequestForRequestSpecifiedInput = z.infer<typeof CheckCanApproveRequestForRequestSpecifiedInput>;

export type CheckCanApproveRequestForRequestSpecified = <T extends CheckCanApproveRequestForRequestSpecifiedInput>(input: T) => ResultAsync<T, StampHubError>;

export const checkCanApproveRequestForFlow =
  (getGroupMemberShip: GroupMemberShipProvider["get"]): CheckCanApproveRequestForFlow =>
  (input) => {
    return parseZodObjectAsync(input, CheckCanApproveRequestForFlowInput)
      .andThen((parsedInput) => {
        if (parsedInput.approvalFlowInfo.approver.approverType !== "approvalFlow") {
          return errAsync(
            new StampHubError(
              "ApproverType is not an approvalFlow. May have been called in the wrong code path",
              "Unexpected error occurred",
              "INTERNAL_SERVER_ERROR"
            )
          );
        }
        if (!parsedInput.approvalFlowInfo.approverGroupId) {
          return errAsync(new StampHubError("User is not an approver", "User is not an approver", "FORBIDDEN"));
        }
        const approverGroup = parsedInput.approvalFlowInfo.approverGroupId;
        // Check if user is in the approver group
        return getGroupMemberShip({ groupId: approverGroup, userId: parsedInput.userIdWhoApproved }).andThen((groupMemberShip) => {
          if (groupMemberShip.isSome()) {
            return okAsync(input);
          }
          return errAsync(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN"));
        });
      })
      .mapErr(convertStampHubError);
  };

export const checkCanApproveRequestForResource =
  (getGroupMemberShip: GroupMemberShipProvider["get"]): CheckCanApproveRequestForResource =>
  (input) => {
    return parseZodObjectAsync(input, CheckCanApproveRequestForResourceInput)
      .andThen((parsedInput) => {
        if (parsedInput.approvalFlowInfo.approver.approverType !== "resource") {
          return errAsync(
            new StampHubError(
              "ApproverType is not an approvalFlow. May have been called in the wrong code path",
              "Unexpected error occurred",
              "INTERNAL_SERVER_ERROR"
            )
          );
        }
        if (!parsedInput.resourceOnDB.approverGroupId) {
          return errAsync(new StampHubError("ApproverGroup is not set", "ApproverGroup is not set", "FORBIDDEN"));
        }
        const approverGroup = parsedInput.resourceOnDB.approverGroupId;
        // Check if user is in the approver group
        return getGroupMemberShip({ groupId: approverGroup, userId: parsedInput.userIdWhoApproved }).andThen((groupMemberShip) => {
          if (groupMemberShip.isSome()) {
            return okAsync(input);
          }
          return errAsync(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN"));
        });
      })
      .mapErr(convertStampHubError);
  };

export const checkCanApproveRequestForRequestSpecified =
  (getGroupMemberShip: GroupMemberShipProvider["get"]): CheckCanApproveRequestForRequestSpecified =>
  (input) => {
    return parseZodObjectAsync(input, CheckCanApproveRequestForRequestSpecifiedInput)
      .andThen((parsedInput) => {
        if (parsedInput.approvalFlowInfo.approver.approverType !== "requestSpecified") {
          return errAsync(
            new StampHubError(
              "ApproverType is not an requestSpecified. May have been called in the wrong code path",
              "Unexpected error occurred",
              "INTERNAL_SERVER_ERROR"
            )
          );
        }
        if (parsedInput.request.approverType !== "group") {
          return errAsync(new StampHubError("ApproverType is not group", "ApproverType is not group", "FORBIDDEN"));
        }

        const approverGroup = parsedInput.request.approverId;
        // Check if user is in the approver group
        return getGroupMemberShip({ groupId: approverGroup, userId: parsedInput.userIdWhoApproved }).andThen((groupMemberShip) => {
          if (groupMemberShip.isSome()) {
            return okAsync(input);
          }
          return errAsync(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN"));
        });
      })
      .mapErr(convertStampHubError);
  };
