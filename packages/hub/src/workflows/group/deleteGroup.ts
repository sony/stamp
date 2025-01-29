import { ResultAsync, okAsync } from "neverthrow";

import { GroupMemberShipProvider, UserProvider, GroupProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";

import { DeleteGroupInput } from "./input";

import { createCheckCanEditGroup } from "../../events/group/authz";
import { createValidateGroupId, createCheckDeleteableGroup } from "../../events/group/validation";
import { createValidateRequestUserId } from "../../events/user/validation";
import { createIsGroupOwner } from "../../events/group/membership";
import { isAdmin } from "../../events/admin/isAdmin";

export function deleteGroup(
  input: DeleteGroupInput,
  userProvider: UserProvider,
  groupProvider: GroupProvider,
  groupMemberShipProvider: GroupMemberShipProvider
): ResultAsync<void, StampHubError> {
  const validateRequestUserId = createValidateRequestUserId(userProvider);
  const validateGroupId = createValidateGroupId(groupProvider);

  const isGroupOwner = createIsGroupOwner(groupMemberShipProvider["get"]);
  const checkCanEditGroup = createCheckCanEditGroup(isGroupOwner, isAdmin(userProvider.get));

  const checkDeleteableGroup = createCheckDeleteableGroup(groupMemberShipProvider);
  return parseZodObjectAsync(input, DeleteGroupInput)
    .andThen(validateRequestUserId)
    .andThen(validateGroupId)
    .andThen(checkCanEditGroup)
    .andThen(checkDeleteableGroup) // check if group is deleteable(only one owner)
    .andThen(groupProvider.delete)
    .andThen(() => {
      //Delete group membership
      return groupMemberShipProvider.delete({ groupId: input.groupId, userId: input.requestUserId }).andThen(() => {
        return okAsync(undefined);
      });
    })
    .mapErr(convertStampHubError);
}
