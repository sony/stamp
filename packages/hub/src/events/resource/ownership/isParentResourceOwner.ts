import { IsUserInGroup } from "../../group/membership";
import { ResourceInfo } from "@stamp-lib/stamp-types/models";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { convertStampHubError, StampHubError } from "../../../error";
import { ResultAsync, okAsync } from "neverthrow";

export type ResourceInfoParamsForParentOwnerCheck = Pick<ResourceInfo, "catalogId" | "parentResourceId" | "parentResourceTypeId">;

function isParentResourceOwnerImpl(
  input: { resourceInfo: ResourceInfoParamsForParentOwnerCheck; requestUserId: string },
  getResourceDB: ResourceDBProvider["getById"],
  checkUserInGroup: IsUserInGroup
): ResultAsync<boolean, StampHubError> {
  if (input.resourceInfo.parentResourceId && input.resourceInfo.parentResourceTypeId) {
    return getResourceDB({
      id: input.resourceInfo.parentResourceId,
      catalogId: input.resourceInfo.catalogId,
      resourceTypeId: input.resourceInfo.parentResourceTypeId,
    })
      .andThen((resourceDB) => {
        if (resourceDB.isNone() || !resourceDB.value.ownerGroupId) {
          return okAsync(false);
        }
        return checkUserInGroup({ groupId: resourceDB.value.ownerGroupId, userId: input.requestUserId });
      })
      .mapErr(convertStampHubError);
  }
  return okAsync(false);
}

export function createIsParentResourceOwner(getResourceDB: ResourceDBProvider["getById"], checkUserInGroup: IsUserInGroup) {
  return (input: { resourceInfo: ResourceInfoParamsForParentOwnerCheck; requestUserId: string }) =>
    isParentResourceOwnerImpl(input, getResourceDB, checkUserInGroup);
}
