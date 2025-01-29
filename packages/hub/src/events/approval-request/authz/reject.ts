import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ApprovalFlowInfo, ResourceOnDB } from "@stamp-lib/stamp-types/models";
import { convertStampHubError, StampHubError } from "../../../error";
import { parseZodObjectAsync } from "../../../utils/neverthrow";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { z } from "zod";
import { RejectApprovalRequestInput } from "../../../inputAuthzModel";

// Check if user can reject the approval request that's approverType is approval flow
export const CheckCanRejectRequestForFlowInput = RejectApprovalRequestInput.extend({ approvalFlowInfo: ApprovalFlowInfo });
export type CheckCanRejectRequestForFlowInput = z.infer<typeof CheckCanRejectRequestForFlowInput>;

export type CheckCanRejectRequestForFlow = <T extends CheckCanRejectRequestForFlowInput>(input: T) => ResultAsync<T, StampHubError>;

// Check if user can reject the approval request that's approverType is resource
export const CheckCanRejectRequestForResourceInput = RejectApprovalRequestInput.extend({ approvalFlowInfo: ApprovalFlowInfo, resourceOnDB: ResourceOnDB });
export type CheckCanRejectRequestForResourceInput = z.infer<typeof CheckCanRejectRequestForResourceInput>;

export type CheckCanRejectRequestForResource = <T extends CheckCanRejectRequestForResourceInput>(input: T) => ResultAsync<T, StampHubError>;

export const checkCanRejectRequestForFlow =
  (getGroupMemberShip: GroupMemberShipProvider["get"]): CheckCanRejectRequestForFlow =>
  <T extends CheckCanRejectRequestForFlowInput>(input: T): ResultAsync<T, StampHubError> => {
    return parseZodObjectAsync(input, CheckCanRejectRequestForFlowInput)
      .andThen((parsedInput) => {
        if (parsedInput.approvalFlowInfo.approver.approverType !== "approvalFlow") {
          // occur unexpected error
          return errAsync(
            new StampHubError(
              "ApproverType is not an approvalFlow. May have been called in the wrong code path",
              "Unexpected error occurred",
              "INTERNAL_SERVER_ERROR"
            )
          );
        }
        if (!parsedInput.approvalFlowInfo.approverGroupId) {
          return errAsync(new StampHubError("ApproverGroup is not set", "ApproverGroup is not set", "FORBIDDEN"));
        }
        const approverGroup = parsedInput.approvalFlowInfo.approverGroupId;
        // Check if user is in the approver group
        return getGroupMemberShip({ groupId: approverGroup, userId: parsedInput.userIdWhoRejected }).andThen((groupMemberShip) => {
          if (groupMemberShip.isSome()) {
            return okAsync(input);
          }
          return errAsync(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN"));
        });
      })
      .mapErr(convertStampHubError);
  };

export const checkCanRejectRequestForResource =
  (getGroupMemberShip: GroupMemberShipProvider["get"]): CheckCanRejectRequestForResource =>
  <T extends CheckCanRejectRequestForResourceInput>(input: T): ResultAsync<T, StampHubError> => {
    return parseZodObjectAsync(input, CheckCanRejectRequestForResourceInput)
      .andThen((parsedInput) => {
        if (parsedInput.approvalFlowInfo.approver.approverType !== "resource") {
          return errAsync(
            new StampHubError(
              "ApproverType is not a resource. May have been called in the wrong code path",
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
        return getGroupMemberShip({ groupId: approverGroup, userId: parsedInput.userIdWhoRejected }).andThen((groupMemberShip) => {
          if (groupMemberShip.isSome()) {
            return okAsync(input);
          }
          return errAsync(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN"));
        });
      })
      .mapErr(convertStampHubError);
  };
