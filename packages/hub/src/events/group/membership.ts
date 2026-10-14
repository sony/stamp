import { GroupId, UserId, GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { z } from "zod";
import { ResultAsync, errAsync, okAsync } from "neverthrow";

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

/**
 * IsUserInGroup backed by an in-memory set of the user's group ids.
 * Use with `createListAllGroupIdsByUser` to evaluate many membership checks with a single identity lookup.
 */
export function createIsUserInGroupFromSet(groupIds: ReadonlySet<GroupId>): IsUserInGroup {
  return (input) =>
    parseZodObjectAsync(input, IsUserInGroupInput)
      .andThen((parsedInput) => okAsync(groupIds.has(parsedInput.groupId)))
      .mapErr(convertStampHubError);
}

export type ListAllGroupIdsByUser = (userId: UserId) => ResultAsync<Set<GroupId>, StampHubError>;

const MAX_GROUP_MEMBERSHIP_PAGES = 50;

/**
 * Collect every group id the user belongs to by following listByUser pagination to the end.
 */
export function createListAllGroupIdsByUser(listByUser: GroupMemberShipProvider["listByUser"]): ListAllGroupIdsByUser {
  const collect = (userId: UserId, paginationToken: string | undefined, acc: Set<GroupId>, page: number): ResultAsync<Set<GroupId>, StampHubError> => {
    if (page >= MAX_GROUP_MEMBERSHIP_PAGES) {
      return errAsync(new StampHubError(`Too many group membership pages for user ${userId}`, "Unexpected error occurred", "INTERNAL_SERVER_ERROR"));
    }
    return listByUser({ userId, limit: 100, paginationToken })
      .mapErr(convertStampHubError)
      .andThen((result) => {
        result.items.forEach((membership) => acc.add(membership.groupId));
        if (result.nextPaginationToken) {
          return collect(userId, result.nextPaginationToken, acc, page + 1);
        }
        return okAsync(acc);
      });
  };
  return (userId) => collect(userId, undefined, new Set<GroupId>(), 0);
}
