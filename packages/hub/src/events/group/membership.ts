import { GroupId, UserId, GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { z } from "zod";
import { ResultAsync, okAsync } from "neverthrow";

export const IsUserInGroupInput = z.object({
  groupId: GroupId,
  userId: UserId,
});
export type IsUserInGroupInput = z.infer<typeof IsUserInGroupInput>;

export type IsUserInGroup = (input: IsUserInGroupInput) => ResultAsync<boolean, StampHubError>;

function isUserInGroupImpl(input: IsUserInGroupInput, getGroupMemberShip: GroupMemberShipProvider["get"]): ResultAsync<boolean, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, IsUserInGroupInput)
    .andThen((parsedInput) => {
      // Check if user is in group
      return getGroupMemberShip({ groupId: parsedInput.groupId, userId: parsedInput.userId }).andThen((groupMemberShipOption) => {
        return okAsync(groupMemberShipOption.isSome());
      });
    })
    .mapErr(convertStampHubError);
}

export function createIsUserInGroup(getGroupMemberShip: GroupMemberShipProvider["get"]): IsUserInGroup {
  return (input) => isUserInGroupImpl(input, getGroupMemberShip);
}

export const IsGroupOwnerInput = z.object({
  groupId: GroupId,
  userId: UserId,
});
export type IsGroupOwnerInput = z.infer<typeof IsGroupOwnerInput>;

export type IsGroupOwner = (input: IsGroupOwnerInput) => ResultAsync<boolean, StampHubError>;

function isGroupOwnerImpl(input: IsGroupOwnerInput, getGroupMemberShip: GroupMemberShipProvider["get"]): ResultAsync<boolean, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, IsGroupOwnerInput)
    .andThen((parsedInput) => {
      // Check if user is in group
      return getGroupMemberShip({ groupId: parsedInput.groupId, userId: parsedInput.userId }).andThen((groupMemberShipOption) => {
        return okAsync(groupMemberShipOption.isSome() && groupMemberShipOption.value.role === "owner");
      });
    })
    .mapErr(convertStampHubError);
}

export function createIsGroupOwner(getGroupMemberShip: GroupMemberShipProvider["get"]): IsGroupOwner {
  return (input) => isGroupOwnerImpl(input, getGroupMemberShip);
}
