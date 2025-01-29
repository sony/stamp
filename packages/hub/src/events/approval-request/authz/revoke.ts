import { GroupMemberShipProvider, UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ApprovalFlowInfo, ResourceOnDB } from "@stamp-lib/stamp-types/models";
import { convertStampHubError, StampHubError } from "../../../error";
import { parseZodObjectAsync } from "../../../utils/neverthrow";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { z } from "zod";
import { RevokeApprovalRequestInput } from "../../../inputAuthzModel";

// Check if user can revoke the approval request that approverType is approval flow
export const CheckCanRevokeRequestForFlowInput = RevokeApprovalRequestInput;
export type CheckCanRevokeRequestForFlowInput = z.infer<typeof CheckCanRevokeRequestForFlowInput>;

export type CheckCanRevokeRequestForFlow = <T extends CheckCanRevokeRequestForFlowInput>(input: T) => ResultAsync<T, StampHubError>;

// Check if user can revoke the approval request that approverType is resource
export const CheckCanRevokeRequestForResourceInput = RevokeApprovalRequestInput.extend({
  approvalFlowInfo: ApprovalFlowInfo,
  resourceOnDB: ResourceOnDB,
  requestUserId: UserId,
});
export type CheckCanRevokeRequestForResourceInput = z.infer<typeof CheckCanRevokeRequestForResourceInput>;

export type CheckCanRevokeRequestForResource = <T extends CheckCanRevokeRequestForResourceInput>(input: T) => ResultAsync<T, StampHubError>;

export const checkCanRevokeRequestForFlow =
  (getGroupMemberShip: GroupMemberShipProvider["get"]): CheckCanRevokeRequestForFlow =>
  <T extends CheckCanRevokeRequestForFlowInput>(input: T): ResultAsync<T, StampHubError> => {
    return parseZodObjectAsync(input, CheckCanRevokeRequestForFlowInput)
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

        // Check if user is the request user
        if (parsedInput.requestUserId === parsedInput.userIdWhoRevoked) {
          return okAsync(input);
        }

        if (!parsedInput.approvalFlowInfo.approverGroupId) {
          return errAsync(new StampHubError("User is not an approver", "User is not an approver", "FORBIDDEN"));
        }
        const approverGroup = parsedInput.approvalFlowInfo.approverGroupId;
        // Check if user is in the approver group
        return getGroupMemberShip({ groupId: approverGroup, userId: parsedInput.userIdWhoRevoked }).andThen((groupMemberShip) => {
          if (groupMemberShip.isSome()) {
            return okAsync(input);
          }
          return errAsync(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN"));
        });
      })
      .mapErr(convertStampHubError);
  };

export const checkCanRevokeRequestForResource =
  (getGroupMemberShip: GroupMemberShipProvider["get"]): CheckCanRevokeRequestForResource =>
  <T extends CheckCanRevokeRequestForResourceInput>(input: T): ResultAsync<T, StampHubError> => {
    return parseZodObjectAsync(input, CheckCanRevokeRequestForResourceInput)
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

        // Check if user is the request user
        if (parsedInput.requestUserId === parsedInput.userIdWhoRevoked) {
          return okAsync(input);
        }

        if (!parsedInput.resourceOnDB.approverGroupId) {
          return errAsync(new StampHubError("User is not an approver", "User is not an approver", "FORBIDDEN"));
        }
        const approverGroup = parsedInput.resourceOnDB.approverGroupId;
        // Check if user is in the approver group
        return getGroupMemberShip({ groupId: approverGroup, userId: parsedInput.userIdWhoRevoked }).andThen((groupMemberShip) => {
          if (groupMemberShip.isSome()) {
            return okAsync(input);
          }
          return errAsync(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN"));
        });
      })
      .mapErr(convertStampHubError);
  };
