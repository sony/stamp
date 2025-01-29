import { GroupProvider, GroupId, UserId, GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { z } from "zod";
import { ResultAsync, okAsync, errAsync } from "neverthrow";

export const ValidateGroupIdInput = z.object({
  groupId: GroupId,
});
export type ValidateGroupIdInput = z.infer<typeof ValidateGroupIdInput>;

export type ValidateGroupId = <T extends ValidateGroupIdInput>(input: T) => ResultAsync<T, StampHubError>;

export function validateGroupIdImpl<T extends ValidateGroupIdInput>(input: T, groupProvider: GroupProvider): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, ValidateGroupIdInput)
    .andThen((parsedInput) => {
      return groupProvider.get({ groupId: parsedInput.groupId });
    })
    .andThen((GroupOption) => {
      // check if  exist
      if (GroupOption.isNone()) {
        return errAsync(new StampHubError("Group is not found", "Group is not found", "BAD_REQUEST"));
      } else {
        return okAsync(input);
      }
    })
    .mapErr(convertStampHubError);
}

export function createValidateGroupId(groupProvider: GroupProvider): ValidateGroupId {
  return (input) => validateGroupIdImpl(input, groupProvider);
}

export const CheckTargetUserInGroupInput = z.object({
  groupId: GroupId,
  targetUserId: UserId,
});
export type CheckTargetUserInGroupInput = z.infer<typeof CheckTargetUserInGroupInput>;

export type CheckTargetUserInGroup = <T extends CheckTargetUserInGroupInput>(input: T) => ResultAsync<T, StampHubError>;

export function checkTargetUserInGroupImpl<T extends CheckTargetUserInGroupInput>(
  input: T,
  groupMemberShipProvider: GroupMemberShipProvider
): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, CheckTargetUserInGroupInput)
    .andThen((parsedInput) => {
      // Check if user is in group
      return groupMemberShipProvider.get({ groupId: parsedInput.groupId, userId: parsedInput.targetUserId }).andThen((groupMemberShipOption) => {
        if (groupMemberShipOption.isSome()) {
          return okAsync(input);
        } else {
          return errAsync(new StampHubError("User not in group", "User Not In Group", "BAD_REQUEST"));
        }
      });
    })
    .mapErr(convertStampHubError);
}

export function createCheckTargetUserInGroup(groupMemberShipProvider: GroupMemberShipProvider): CheckTargetUserInGroup {
  return (input) => checkTargetUserInGroupImpl(input, groupMemberShipProvider);
}

export const CheckTargetUserNotInGroupInput = z.object({
  groupId: GroupId,
  targetUserId: UserId,
});
export type CheckTargetUserNotInGroupInput = z.infer<typeof CheckTargetUserNotInGroupInput>;

export type CheckTargetUserNotInGroup = <T extends CheckTargetUserNotInGroupInput>(input: T) => ResultAsync<T, StampHubError>;

export function checkTargetUserNotInGroupImpl<T extends CheckTargetUserNotInGroupInput>(
  input: T,
  groupMemberShipProvider: GroupMemberShipProvider
): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, CheckTargetUserNotInGroupInput)
    .andThen((parsedInput) => {
      // Check if user is in group
      return groupMemberShipProvider.get({ groupId: parsedInput.groupId, userId: parsedInput.targetUserId }).andThen((groupMemberShipOption) => {
        if (groupMemberShipOption.isSome()) {
          return errAsync(new StampHubError("User already in group", "User already In Group", "BAD_REQUEST"));
        } else {
          return okAsync(input);
        }
      });
    })
    .mapErr(convertStampHubError);
}

export function createCheckTargetUserNotInGroup(groupMemberShipProvider: GroupMemberShipProvider): CheckTargetUserNotInGroup {
  return (input) => checkTargetUserNotInGroupImpl(input, groupMemberShipProvider);
}

export const CheckDeleteableGroupInput = z.object({
  groupId: GroupId,
});
export type CheckDeleteableGroupInput = z.infer<typeof CheckDeleteableGroupInput>;

export type CheckDeleteableGroup = <T extends CheckDeleteableGroupInput>(input: T) => ResultAsync<T, StampHubError>;

// Check if group is deletable
// Group is deletable if it has less than one member and that member is the request user.
export function checkDeleteableGroupImpl<T extends CheckDeleteableGroupInput>(
  input: T,
  groupMemberShipProvider: GroupMemberShipProvider
): ResultAsync<T, StampHubError> {
  return parseZodObjectAsync(input, CheckDeleteableGroupInput)
    .andThen((parsedInput) => {
      return groupMemberShipProvider.count({ groupId: parsedInput.groupId }).andThen((count) => {
        if (count > 1) {
          return errAsync(new StampHubError("Group is not deletable", "Group is not deletable", "BAD_REQUEST"));
        } else {
          return okAsync(input);
        }
      });
    })
    .mapErr(convertStampHubError);
}

export function createCheckDeleteableGroup(groupMemberShipProvider: GroupMemberShipProvider): CheckDeleteableGroup {
  return (input) => checkDeleteableGroupImpl(input, groupMemberShipProvider);
}
