import { GetResourceInfoInput } from "./input";

import { Option, none, some } from "@stamp-lib/stamp-option";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResourceInfo, ResourceOnDB } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, okAsync } from "neverthrow";
import { convertStampHubError, StampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { createValidateCatalogId } from "../../events/catalog/validation";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { validateResourceTypeId } from "../../events/resource-type/validation";
import { createGetResourceInfo } from "../../events/resource/info/get";
import { createCheckCanViewResource } from "../../events/resource/visibility/canViewResource";
import { parseZodObjectAsync } from "../../utils/neverthrow";

export type GetResourceInfo = (input: GetResourceInfoInput) => ResultAsync<Option<ResourceInfo>, StampHubError>;

/**
 * Resolve ResourceInfo without the visibility check.
 * For internal / system use only (e.g. applying an approved resource update); user-facing routes must use `getResourceInfo`.
 */
export const getResourceInfoWithoutVisibilityCheck = (providers: {
  getCatalogConfigProvider: CatalogConfigProvider["get"];
  getResourceDBProvider: ResourceDBProvider["getById"];
}): GetResourceInfo => {
  return (input: GetResourceInfoInput): ResultAsync<Option<ResourceInfo>, StampHubError> => {
    const { getCatalogConfigProvider, getResourceDBProvider } = providers;
    const validateCatalogId = createValidateCatalogId(getCatalogConfigProvider);
    const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);
    const getResourceInfoEvent = createGetResourceInfo(getResourceDBProvider);
    return parseZodObjectAsync(input, GetResourceInfoInput)
      .andThen(validateCatalogId)
      .andThen(getCatalogConfig)
      .andThen(validateResourceTypeId)
      .andThen(getResourceTypeConfig)
      .andThen(getResourceInfoEvent)
      .mapErr(convertStampHubError);
  };
};

/**
 * Resolve ResourceInfo for the request user.
 * Resources with visibility "restricted" are only returned to catalog owner / owner / approver / requester / parent owner (FORBIDDEN otherwise).
 */
export const getResourceInfo = (providers: {
  getCatalogConfigProvider: CatalogConfigProvider["get"];
  getResourceDBProvider: ResourceDBProvider["getById"];
  getCatalogDBProvider: CatalogDBProvider["getById"];
  listGroupMemberShipByUser: GroupMemberShipProvider["listByUser"];
}): GetResourceInfo => {
  const { getCatalogConfigProvider, getResourceDBProvider, getCatalogDBProvider, listGroupMemberShipByUser } = providers;
  const getResourceInfoInternal = getResourceInfoWithoutVisibilityCheck({ getCatalogConfigProvider, getResourceDBProvider });
  const checkCanViewResource = createCheckCanViewResource({
    getResourceDB: getResourceDBProvider,
    getCatalogDB: getCatalogDBProvider,
    listGroupMemberShipByUser,
  });
  return (input: GetResourceInfoInput): ResultAsync<Option<ResourceInfo>, StampHubError> => {
    return getResourceInfoInternal(input)
      .andThen((resourceInfo) => {
        if (resourceInfo.isNone()) {
          return okAsync(none);
        }
        const info = resourceInfo.value;
        const resourceOnDB: ResourceOnDB = {
          id: info.id,
          catalogId: info.catalogId,
          resourceTypeId: info.resourceTypeId,
          approverGroupId: info.approverGroupId,
          ownerGroupId: info.ownerGroupId,
          requesterGroupIds: info.requesterGroupIds,
          visibility: info.visibility,
        };
        return checkCanViewResource({
          requestUserId: input.requestUserId,
          catalogId: input.catalogId,
          resourceOnDB: some(resourceOnDB),
          resolveParent: () =>
            okAsync(
              info.parentResourceId !== undefined && info.parentResourceTypeId !== undefined
                ? some({ resourceTypeId: info.parentResourceTypeId, resourceId: info.parentResourceId })
                : none
            ),
        }).map(() => resourceInfo);
      })
      .mapErr(convertStampHubError);
  };
};
