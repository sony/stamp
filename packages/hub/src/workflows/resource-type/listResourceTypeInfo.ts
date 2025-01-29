import { ResourceTypeInfo } from "@stamp-lib/stamp-types/models";
import { ListResourceTypeInfoInput } from "./input";
import { StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync, okAsync } from "neverthrow";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";

export function listResourceTypeInfo(
  input: ListResourceTypeInfoInput,
  catalogConfigProvider: CatalogConfigProvider
): ResultAsync<ResourceTypeInfo[], StampHubError> {
  const getCatalogConfig = createGetCatalogConfig(catalogConfigProvider.get);
  return parseZodObjectAsync(input, ListResourceTypeInfoInput)
    .andThen(getCatalogConfig)
    .andThen((extendInput) => {
      const resourceTypeInfoList = extendInput.catalogConfig.resourceTypes.map((resourceType) => {
        const resourceTypeInfo: ResourceTypeInfo = {
          id: resourceType.id,
          name: resourceType.name,
          description: resourceType.description,
          catalogId: extendInput.catalogConfig.id,
          createParams: resourceType.createParams,
          parentResourceTypeId: resourceType.parentResourceTypeId,
          infoParams: resourceType.infoParams,
          isCreatable: resourceType.isCreatable,
          isUpdatable: resourceType.isUpdatable,
          isDeletable: resourceType.isDeletable,
          ownerManagement: resourceType.ownerManagement,
          approverManagement: resourceType.approverManagement,
        };
        return resourceTypeInfo;
      });
      return okAsync(resourceTypeInfoList);
    });
}
