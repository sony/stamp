import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { EditGroupInput, ReadGroupInput, CreateGroupInput } from "../../inputAuthzModel";
import { IsGroupOwner } from "./membership";
import { IsAdmin } from "../admin/isAdmin";
export type CheckCanEditGroup = <T extends EditGroupInput>(input: T) => ResultAsync<T, StampHubError>;

export function checkCanEditGroupImpl<T extends EditGroupInput>(input: T, isGroupOwner: IsGroupOwner, isAdmin: IsAdmin): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, EditGroupInput)
    .andThen((parsedInput) => {
      // Check Permission
      const isGroupOwnerResult = isGroupOwner({ groupId: parsedInput.groupId, userId: parsedInput.requestUserId });
      const isAdminResult = isAdmin({ userId: parsedInput.requestUserId });

      return ResultAsync.combine([isGroupOwnerResult, isAdminResult]);
    })
    .andThen(([isGroupOwner, isAdmin]) => {
      if (isGroupOwner || isAdmin) {
        return okAsync(input);
      } else {
        return errAsync(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN"));
      }
    })
    .mapErr(convertStampHubError);
}

export function createCheckCanEditGroup(isGroupOwner: IsGroupOwner, isAdmin: IsAdmin): CheckCanEditGroup {
  return (input) => checkCanEditGroupImpl(input, isGroupOwner, isAdmin);
}

export type CheckCanReadGroup = <T extends ReadGroupInput>(input: T) => ResultAsync<T, StampHubError>;

export function checkCanReadGroupImpl<T extends ReadGroupInput>(input: T): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, ReadGroupInput)
    .andThen(() => {
      //Currently, all users have Read permission.
      return okAsync(input);
    })
    .mapErr(convertStampHubError);
}

export function createCheckCanReadGroup(): CheckCanReadGroup {
  return (input) => checkCanReadGroupImpl(input);
}

export type CheckCanCreateGroup = <T extends CreateGroupInput>(input: T) => ResultAsync<T, StampHubError>;

export function checkCanCreateGroupImpl<T extends CreateGroupInput>(input: T): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, CreateGroupInput)
    .andThen(() => {
      //Currently, all users have Create Group permission.
      return okAsync(input);
    })
    .mapErr(convertStampHubError);
}

export function createCheckCanCreateGroup(): CheckCanCreateGroup {
  return (input) => checkCanCreateGroupImpl(input);
}
