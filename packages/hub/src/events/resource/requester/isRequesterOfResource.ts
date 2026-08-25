import { Option } from "@stamp-lib/stamp-option";
import { ResourceOnDB } from "@stamp-lib/stamp-types/models";
import { UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, okAsync } from "neverthrow";
import { StampHubError } from "../../../error";
import { IsUserInGroup } from "../../group/membership";

export type IsRequesterOfResourceInput = {
  requestUserId: UserId;
  resourceOnDB: Option<Pick<ResourceOnDB, "requesterGroupIds">>;
};
export type IsRequesterOfResource = (input: IsRequesterOfResourceInput) => ResultAsync<boolean, StampHubError>;

/**
 * Whether the user may submit approval requests for the resource.
 * No DB row, or no / empty `requesterGroupIds`, means anyone can request.
 */
export function createIsRequesterOfResource(isUserInGroup: IsUserInGroup): IsRequesterOfResource {
  return ({ requestUserId, resourceOnDB }) => {
    if (resourceOnDB.isNone()) {
      return okAsync(true);
    }
    const requesterGroupIds = resourceOnDB.value.requesterGroupIds;
    if (requesterGroupIds === undefined || requesterGroupIds.length === 0) {
      return okAsync(true);
    }
    return ResultAsync.combine(requesterGroupIds.map((groupId) => isUserInGroup({ groupId, userId: requestUserId }))).map((results) =>
      results.some((isMember) => isMember)
    );
  };
}
