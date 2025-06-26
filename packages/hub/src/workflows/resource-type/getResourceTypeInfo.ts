import { ResourceTypeInfo } from "@stamp-lib/stamp-types/models";
import { GetResourceTypeInfoInput } from "./input";
import { StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { GetCatalogConfig } from "../../events/catalog/catalogConfig";

import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";

export type GetResourceTypeInfo = (input: GetResourceTypeInfoInput) => ResultAsync<ResourceTypeInfo, StampHubError>;

export const getResourceTypeInfo = (getCatalogConfig: GetCatalogConfig): GetResourceTypeInfo => {
  return (input: GetResourceTypeInfoInput): ResultAsync<ResourceTypeInfo, StampHubError> => {
    return parseZodObjectAsync(input, GetResourceTypeInfoInput)
      .andThen(getCatalogConfig)
      .andThen(getResourceTypeConfig)
      .andThen((extendInput) => {
        const resourceType = extendInput.catalogConfig.resourceTypes.find((resourceType) => resourceType.id === extendInput.resourceTypeId);
        if (resourceType == undefined) {
          return errAsync(new StampHubError("ResourceType not found", "ResourceType Not Found", "NOT_FOUND"));
        }
        const resourceTypeInfo: ResourceTypeInfo = {
          id: resourceType.id,
          name: resourceType.name,
          description: resourceType.description,
          catalogId: extendInput.catalogConfig.id,
          createParams: resourceType.createParams,
          infoParams: resourceType.infoParams,
          parentResourceTypeId: resourceType.parentResourceTypeId,
          isCreatable: resourceType.isCreatable,
          isUpdatable: resourceType.isUpdatable,
          isDeletable: resourceType.isDeletable,
          ownerManagement: resourceType.ownerManagement,
          approverManagement: resourceType.approverManagement,
          updateApprover: resourceType.updateApprover,
        };
        return okAsync(resourceTypeInfo);
      });
  };
};
