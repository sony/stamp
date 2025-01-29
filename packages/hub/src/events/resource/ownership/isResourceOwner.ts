import { IsUserInGroup } from "../../group/membership";

import { ResourceInfo } from "@stamp-lib/stamp-types/models";
import { StampHubError } from "../../../error";
import { ResultAsync, okAsync } from "neverthrow";

function isResourceOwnerImpl(
  input: { requestUserId: string; resourceInfo: ResourceInfo },
  checkUserInGroup: IsUserInGroup
): ResultAsync<boolean, StampHubError> {
  if (input.resourceInfo.ownerGroupId) {
    return checkUserInGroup({ groupId: input.resourceInfo.ownerGroupId, userId: input.requestUserId });
  }
  return okAsync(false);
}

export function createIsResourceOwner(checkUserInGroup: IsUserInGroup) {
  return (input: { requestUserId: string; resourceInfo: ResourceInfo }) => isResourceOwnerImpl(input, checkUserInGroup);
}
