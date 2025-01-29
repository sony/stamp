import { GroupMemberShipProvider, UserProvider, GroupProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync, okAsync } from "neverthrow";
import { CreateGroupInput } from "./input";
import { Group } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { createCheckCanCreateGroup } from "../../events/group/authz";

import { createValidateRequestUserId } from "../../events/user/validation";

export function createGroup(
  input: CreateGroupInput,
  userProvider: UserProvider,
  groupProvider: GroupProvider,
  groupMemberShipProvider: GroupMemberShipProvider
): ResultAsync<Group, StampHubError> {
  const validateRequestUserId = createValidateRequestUserId(userProvider);
  const checkCanCreateGroup = createCheckCanCreateGroup();

  return parseZodObjectAsync(input, CreateGroupInput)
    .andThen(validateRequestUserId)
    .andThen(checkCanCreateGroup)
    .andThen(groupProvider.create)
    .andThen((group) => {
      //create group membership
      return groupMemberShipProvider.create({ groupId: group.groupId, userId: input.requestUserId, role: "owner" }).andThen(() => {
        return okAsync(group);
      });
    })
    .mapErr(convertStampHubError);
}
