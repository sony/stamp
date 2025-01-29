import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { UpdateResourceApproverInput } from "../../../inputAuthzModel";
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

export type CheckCanUpdateResourceApprover = <T extends UpdateResourceApproverInput>(input: T) => ResultAsync<T, StampHubError>;
export function checkCanUpdateResourceApproverImpl<T extends UpdateResourceApproverInput>(
  input: T,
  getCatalogDBProvider: CatalogDBProvider["getById"],
  getCatalogConfigProvider: CatalogConfigProvider["get"],
  getResourceDBProvider: ResourceDBProvider["getById"],
  getGroupMemberShipProvider: GroupMemberShipProvider["get"]
) {
  const getResourceInfo = createGetResourceInfo(getResourceDBProvider);
  const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);
  const checkUserInGroup = createIsUserInGroup(getGroupMemberShipProvider);
  const checkCatalogOwner = createIsCatalogOwner(getCatalogDBProvider, checkUserInGroup);

  const checkParentResourceOwner = createIsParentResourceOwner(getResourceDBProvider, checkUserInGroup);

  // Validate input
  return parseZodObjectAsync(input, UpdateResourceApproverInput)
    .andThen(getCatalogConfig)
    .andThen(getResourceTypeConfig)
    .andThen((extendInput) => {
      // Add resourceInfo to extendInput
      return getResourceInfo(extendInput).andThen((resourceOption) => {
        if (resourceOption.isNone()) {
          return errAsync(new StampHubError("Resource not found", "Resource Not Found", "BAD_REQUEST"));
        }
        return okAsync({ ...extendInput, resourceInfo: resourceOption.value });
      });
    })
    .andThen((extendInput) => {
      const isCatalogOwnerResult = checkCatalogOwner(extendInput);
      const isParentResourceOwnerResult = checkParentResourceOwner(extendInput);
      return ResultAsync.combine([isCatalogOwnerResult, isParentResourceOwnerResult]);
    })
    .andThen(([checkCatalogOwnerResult, checkParentResourceOwnerResult]) => {
      if (checkCatalogOwnerResult || checkParentResourceOwnerResult) {
        return okAsync(input);
      }
      return errAsync(new StampHubError("Permission denied", "Permission Denied", "FORBIDDEN"));
    })
    .mapErr(convertStampHubError);
}

export function createCheckCanUpdateResourceApprover(
  getCatalogDBProvider: CatalogDBProvider["getById"],
  getCatalogConfigProvider: CatalogConfigProvider["get"],
  getResourceDBProvider: ResourceDBProvider["getById"],
  getGroupMemberShipProvider: GroupMemberShipProvider["get"]
): CheckCanUpdateResourceApprover {
  return (input) =>
    checkCanUpdateResourceApproverImpl(input, getCatalogDBProvider, getCatalogConfigProvider, getResourceDBProvider, getGroupMemberShipProvider);
}
