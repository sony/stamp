import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { UpdateResourceOwnerInput } from "../../../inputAuthzModel";
import { createIsCatalogOwner } from "../../catalog/ownership/isCatalogOwner";
import { StampHubError, convertStampHubError } from "../../../error";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { createGetResourceInfo } from "../info/get";
import { createGetCatalogConfig } from "../../catalog/catalogConfig";
import { createIsUserInGroup } from "../../group/membership";
import { createIsParentResourceOwner } from "../ownership/isParentResourceOwner";
import { parseZodObjectAsync } from "../../../utils/neverthrow";
import { getResourceTypeConfig } from "../../resource-type/resourceTypeConfig";

export type CheckCanUpdateResourceOwner = <T extends UpdateResourceOwnerInput>(input: T) => ResultAsync<T, StampHubError>;
export function checkCanUpdateResourceOwnerImpl<T extends UpdateResourceOwnerInput>(
  input: T,
  getCatalogDBProvider: CatalogDBProvider["getById"],
  getCatalogConfigProvider: CatalogConfigProvider["get"],
  getResourceDBProvider: ResourceDBProvider["getById"],
  getGroupMemberShipProvider: GroupMemberShipProvider["get"]
) {
  const getResourceInfo = createGetResourceInfo(getResourceDBProvider);
  const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);
  const checkUserInGroup = createIsUserInGroup(getGroupMemberShipProvider);
  const isCatalogOwner = createIsCatalogOwner(getCatalogDBProvider, checkUserInGroup);

  const isParentResourceOwner = createIsParentResourceOwner(getResourceDBProvider, checkUserInGroup);

  // Validate input
  return parseZodObjectAsync(input, UpdateResourceOwnerInput)
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
      const isCatalogOwnerResult = isCatalogOwner(extendInput);
      const isParentResourceOwnerResult = isParentResourceOwner(extendInput);
      return ResultAsync.combine([isCatalogOwnerResult, isParentResourceOwnerResult]);
    })
    .andThen(([isCatalogOwner, isParentResourceOwner]) => {
      if (isCatalogOwner || isParentResourceOwner) {
        return okAsync(input);
      }
      return errAsync(new StampHubError("Permission denied", "Permission Denied", "FORBIDDEN"));
    })
    .mapErr(convertStampHubError);
}

export function createCheckCanUpdateResourceOwner(
  getCatalogDBProvider: CatalogDBProvider["getById"],
  getCatalogConfigProvider: CatalogConfigProvider["get"],
  getResourceDBProvider: ResourceDBProvider["getById"],
  getGroupMemberShipProvider: GroupMemberShipProvider["get"]
): CheckCanUpdateResourceOwner {
  return (input) => checkCanUpdateResourceOwnerImpl(input, getCatalogDBProvider, getCatalogConfigProvider, getResourceDBProvider, getGroupMemberShipProvider);
}
