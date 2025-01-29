import { ResultAsync } from "neverthrow";

import { UserProvider, GroupProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";

import { GetGroupInput } from "./input";

import { Group } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { Option } from "@stamp-lib/stamp-option";
import { createCheckCanReadGroup } from "../../events/group/authz";
import { createValidateRequestUserId } from "../../events/user/validation";

export function getGroup(input: GetGroupInput, userProvider: UserProvider, groupProvider: GroupProvider): ResultAsync<Option<Group>, StampHubError> {
  const validateRequestUserId = createValidateRequestUserId(userProvider);
  const checkCanReadGroup = createCheckCanReadGroup();
  return parseZodObjectAsync(input, GetGroupInput)
    .andThen(validateRequestUserId)
    .andThen(checkCanReadGroup)
    .andThen(groupProvider.get)
    .mapErr(convertStampHubError);
}
