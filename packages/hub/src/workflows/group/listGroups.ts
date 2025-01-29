import { ResultAsync } from "neverthrow";

import { UserProvider, GroupProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";

import { ListGroupInput } from "./input";

import { Group } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { createValidateRequestUserId } from "../../events/user/validation";

export function listGroup(
  input: ListGroupInput,
  userProvider: UserProvider,
  groupProvider: GroupProvider
): ResultAsync<
  {
    items: Array<Group>;
    nextPaginationToken?: string;
  },
  StampHubError
> {
  const validateRequestUserId = createValidateRequestUserId(userProvider);
  return parseZodObjectAsync(input, ListGroupInput).andThen(validateRequestUserId).andThen(groupProvider.list).mapErr(convertStampHubError);
}
