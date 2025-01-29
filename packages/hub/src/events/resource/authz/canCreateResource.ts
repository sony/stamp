import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { createIsUserInGroup } from "../../group/membership";
import { CreateResourceInput } from "../../../inputAuthzModel";

import { CatalogDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";

import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { convertStampHubError, StampHubError } from "../../../error";
import { parseZodObjectAsync } from "../../../utils/neverthrow";
import { ResultAsync, okAsync, errAsync } from "neverthrow";

import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { getResourceTypeConfig } from "../../resource-type/resourceTypeConfig";
import { createGetCatalogConfig } from "../../catalog/catalogConfig";

import { createIsCatalogOwner } from "../../catalog/ownership/isCatalogOwner";

import { createIsParentResourceOwner } from "../ownership/isParentResourceOwner";

export type CheckCanCreateResource = <T extends CreateResourceInput>(input: T) => ResultAsync<T, StampHubError>;

export function checkCanCreateResourceImpl<T extends CreateResourceInput>(
  input: T,
  getCatalogDBProvider: CatalogDBProvider["getById"],
  getCatalogConfigProvider: CatalogConfigProvider["get"],
  getResourceDBProvider: ResourceDBProvider["getById"],
  getGroupMemberShipProvider: GroupMemberShipProvider["get"]
): ResultAsync<T, StampHubError> {
  const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);
  const isUserInGroup = createIsUserInGroup(getGroupMemberShipProvider);
  const isCatalogOwner = createIsCatalogOwner(getCatalogDBProvider, isUserInGroup);
  const isParentResourceOwner = createIsParentResourceOwner(getResourceDBProvider, isUserInGroup);

  // Validate input
  return parseZodObjectAsync(input, CreateResourceInput)
    .andThen(getCatalogConfig)
    .andThen(getResourceTypeConfig)
    .andThen((extendInput) => {
      // Check permission

      // Check anyone can create in Resource Type Setting
      const checkAnyoneCanCreateResult = okAsync(extendInput.resourceTypeConfig.anyoneCanCreate ?? false);
      // Check requestUser is catalog owner
      const checkCatalogOwnerResult = isCatalogOwner(extendInput);
      // Check requestUser is Resource owner
      const checkParentResourceOwnerResult = isParentResourceOwner({
        resourceInfo: {
          catalogId: extendInput.catalogId,
          parentResourceId: extendInput.parentResourceId,
          parentResourceTypeId: extendInput.resourceTypeConfig.parentResourceTypeId,
        },
        requestUserId: extendInput.requestUserId,
      });
      return ResultAsync.combine([checkAnyoneCanCreateResult, checkCatalogOwnerResult, checkParentResourceOwnerResult]);
    })
    .andThen(([checkAnyoneCanCreateResult, checkCatalogOwnerResult, checkParentResourceOwnerResult]) => {
      if (checkAnyoneCanCreateResult || checkCatalogOwnerResult || checkParentResourceOwnerResult) {
        return okAsync(input);
      }
      return errAsync(new StampHubError("Permission denied", "Permission Denied", "FORBIDDEN"));
    })
    .mapErr(convertStampHubError);
}

export function createCheckCanCreateResource(
  getCatalogDBProvider: CatalogDBProvider["getById"],
  getCatalogConfigProvider: CatalogConfigProvider["get"],
  getResourceDBProvider: ResourceDBProvider["getById"],
  getGroupMemberShipProvider: GroupMemberShipProvider["get"]
): CheckCanCreateResource {
  return (input) => checkCanCreateResourceImpl(input, getCatalogDBProvider, getCatalogConfigProvider, getResourceDBProvider, getGroupMemberShipProvider);
}
