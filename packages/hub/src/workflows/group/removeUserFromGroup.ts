import { GroupMemberShipProvider, UserProvider, GroupProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync, okAsync } from "neverthrow";
import { RemoveUserFromGroupInput } from "./input";
import { createValidateGroupId, createCheckTargetUserInGroup } from "../../events/group/validation";
import { createCheckCanEditGroup } from "../../events/group/authz";
import { createValidateTargetUserId, createValidateRequestUserId } from "../../events/user/validation";
import { createIsGroupOwner } from "../../events/group/membership";
import { isAdmin } from "../../events/admin/isAdmin";

export function removeUserFromGroup(
  input: RemoveUserFromGroupInput,
  userProvider: UserProvider,
  groupProvider: GroupProvider,
  groupMemberShipProvider: GroupMemberShipProvider
): ResultAsync<void, StampHubError> {
  const validateTargetUserId = createValidateTargetUserId(userProvider);
  const validateRequestUserId = createValidateRequestUserId(userProvider);
  const validateGroupId = createValidateGroupId(groupProvider);

  const isGroupOwner = createIsGroupOwner(groupMemberShipProvider["get"]);
  const checkCanEditGroup = createCheckCanEditGroup(isGroupOwner, isAdmin(userProvider.get));

  const checkTargetUserInGroup = createCheckTargetUserInGroup(groupMemberShipProvider);

  return parseZodObjectAsync(input, RemoveUserFromGroupInput)
    .andThen(validateTargetUserId)
    .andThen(validateRequestUserId)
    .andThen(validateGroupId)
    .andThen(checkCanEditGroup)
    .andThen(checkTargetUserInGroup)
    .andThen((input) => {
      return groupMemberShipProvider.delete({ groupId: input.groupId, userId: input.targetUserId }).andThen(() => {
        return okAsync(undefined);
      });
    })
    .mapErr(convertStampHubError);
}
