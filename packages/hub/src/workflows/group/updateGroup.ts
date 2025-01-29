import { UserProvider, GroupProvider, GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync } from "neverthrow";
import { UpdateGroupInput } from "./input";
import { Group } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { createCheckCanEditGroup } from "../../events/group/authz";

import { createValidateRequestUserId } from "../../events/user/validation";
import { createValidateGroupId } from "../../events/group/validation";
import { createIsGroupOwner } from "../../events/group/membership";
import { isAdmin } from "../../events/admin/isAdmin";

export function updateGroup(
  input: UpdateGroupInput,
  userProvider: UserProvider,
  groupProvider: GroupProvider,
  groupMemberShipProvider: GroupMemberShipProvider
): ResultAsync<Group, StampHubError> {
  const validateRequestUserId = createValidateRequestUserId(userProvider);

  const isGroupOwner = createIsGroupOwner(groupMemberShipProvider["get"]);
  const checkCanEditGroup = createCheckCanEditGroup(isGroupOwner, isAdmin(userProvider.get));

  const validateGroupId = createValidateGroupId(groupProvider);

  return parseZodObjectAsync(input, UpdateGroupInput)
    .andThen(validateRequestUserId)
    .andThen(validateGroupId)
    .andThen(checkCanEditGroup)
    .andThen(groupProvider.update)
    .mapErr(convertStampHubError);
}
