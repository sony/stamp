import { GroupMemberShipProvider, UserProvider, GroupProvider, GroupMemberShip } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync } from "neverthrow";
import { ListGroupMemberShipByGroupInput } from "./input";
import { createCheckCanReadGroup } from "../../events/group/authz";
import { createValidateGroupId } from "../../events/group/validation";
import { createValidateRequestUserId } from "../../events/user/validation";

export const listGroupMemberShipByGroup =
  (providers: { userProvider: UserProvider; groupProvider: GroupProvider; groupMemberShipProvider: GroupMemberShipProvider }) =>
  (
    input: ListGroupMemberShipByGroupInput
  ): ResultAsync<
    {
      items: Array<GroupMemberShip>;
      nextPaginationToken?: string;
    },
    StampHubError
  > => {
    const { userProvider, groupProvider, groupMemberShipProvider } = providers;
    const validateRequestUserId = createValidateRequestUserId(userProvider);
    const validateGroup = createValidateGroupId(groupProvider);
    const checkCanReadGroup = createCheckCanReadGroup();

    return parseZodObjectAsync(input, ListGroupMemberShipByGroupInput)
      .andThen(validateRequestUserId)
      .andThen(validateGroup)
      .andThen(checkCanReadGroup)
      .andThen(groupMemberShipProvider.listByGroup)
      .mapErr(convertStampHubError);
  };
