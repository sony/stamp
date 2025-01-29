import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { createIsUserInGroup } from "../../group/membership";
import { EditResourceInput } from "../../../inputAuthzModel";

import { CatalogDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";

import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { convertStampHubError, StampHubError } from "../../../error";
import { parseZodObjectAsync } from "../../../utils/neverthrow";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { createGetResourceInfo } from "../info/get";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { getResourceTypeConfig } from "../../resource-type/resourceTypeConfig";
import { createGetCatalogConfig } from "../../catalog/catalogConfig";

import { createIsCatalogOwner } from "../../catalog/ownership/isCatalogOwner";
import { createIsResourceOwner } from "../ownership/isResourceOwner";
import { createIsParentResourceOwner } from "../ownership/isParentResourceOwner";

export type CheckCanEditResource = <T extends EditResourceInput>(input: T) => ResultAsync<T, StampHubError>;

export function checkCanEditResourceImpl<T extends EditResourceInput>(
  input: T,
  getCatalogDBProvider: CatalogDBProvider["getById"],
  getCatalogConfigProvider: CatalogConfigProvider["get"],
  getResourceDBProvider: ResourceDBProvider["getById"],
  getGroupMemberShipProvider: GroupMemberShipProvider["get"]
): ResultAsync<T, StampHubError> {
  const getResourceInfo = createGetResourceInfo(getResourceDBProvider);
  const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);
  const checkUserInGroup = createIsUserInGroup(getGroupMemberShipProvider);
  const checkCatalogOwner = createIsCatalogOwner(getCatalogDBProvider, checkUserInGroup);
  const isResourceOwner = createIsResourceOwner(checkUserInGroup);
  const isParentResourceOwner = createIsParentResourceOwner(getResourceDBProvider, checkUserInGroup);

  // Validate input
  return parseZodObjectAsync(input, EditResourceInput)
    .andThen(getCatalogConfig)
    .andThen(getResourceTypeConfig)
    .andThen((extendInput) => {
      // Add resourceInfo
      return getResourceInfo(extendInput).andThen((resourceOption) => {
        if (resourceOption.isNone()) {
          return errAsync(new StampHubError("Resource not found", "Resource Not Found", "BAD_REQUEST"));
        }
        return okAsync({ ...extendInput, resourceInfo: resourceOption.value });
      });
    })
    .andThen((extendInput) => {
      const checkCatalogOwnerResult = checkCatalogOwner(extendInput);
      const checkResourceOwnerResult = isResourceOwner(extendInput);
      const checkParentResourceOwnerResult = isParentResourceOwner(extendInput);
      return ResultAsync.combine([checkCatalogOwnerResult, checkResourceOwnerResult, checkParentResourceOwnerResult]);
    })
    .andThen(([checkCatalogOwnerResult, checkResourceOwnerResult, checkParentResourceOwnerResult]) => {
      if (checkCatalogOwnerResult || checkResourceOwnerResult || checkParentResourceOwnerResult) {
        return okAsync(input);
      }
      return errAsync(new StampHubError("Permission denied", "Permission Denied", "FORBIDDEN"));
    })
    .mapErr(convertStampHubError);
}

export function createCheckCanEditResource(
  getCatalogDBProvider: CatalogDBProvider["getById"],
  getCatalogConfigProvider: CatalogConfigProvider["get"],
  getResourceDBProvider: ResourceDBProvider["getById"],
  getGroupMemberShipProvider: GroupMemberShipProvider["get"]
): CheckCanEditResource {
  return (input) => checkCanEditResourceImpl(input, getCatalogDBProvider, getCatalogConfigProvider, getResourceDBProvider, getGroupMemberShipProvider);
}
