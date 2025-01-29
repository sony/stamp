import { UpdateResourceOwnerInput } from "./input";

import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResourceOnDB } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { errAsync, okAsync } from "neverthrow";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { parseZodObject } from "../../utils/neverthrow";

import { createCheckCanUpdateResourceOwner } from "../../events/resource/authz/canUpdateResourceOwner";

export const updateResourceOwner =
  (providers: {
    catalogDBProvider: CatalogDBProvider;
    catalogConfigProvider: CatalogConfigProvider;
    resourceDBProvider: ResourceDBProvider;
    getGroupMemberShip: GroupMemberShipProvider["get"];
  }) =>
  (input: UpdateResourceOwnerInput) => {
    const { catalogDBProvider, catalogConfigProvider, resourceDBProvider, getGroupMemberShip } = providers;
    const getCatalogConfig = createGetCatalogConfig(catalogConfigProvider.get);
    const checkCanUpdateResourceOwner = createCheckCanUpdateResourceOwner(
      catalogDBProvider.getById,
      catalogConfigProvider.get,
      resourceDBProvider.getById,
      getGroupMemberShip
    );

    const parsedInputResult = parseZodObject(input, UpdateResourceOwnerInput);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const parsedInput = parsedInputResult.value;

    return (
      getCatalogConfig(parsedInput)
        //TODO: validate groupId and UserId
        .andThen(checkCanUpdateResourceOwner)
        .andThen(getResourceTypeConfig)
        .andThen((extendInput) => {
          const resourceResult = resourceDBProvider.getById({
            id: parsedInput.resourceId,
            catalogId: parsedInput.catalogId,
            resourceTypeId: extendInput.resourceTypeConfig.id,
          });
          return resourceResult.andThen((resource) => {
            if (resource.isNone()) {
              return okAsync({
                id: extendInput.resourceId,
                catalogId: extendInput.catalogId,
                resourceTypeId: extendInput.resourceTypeId,
              } as ResourceOnDB);
            }
            return okAsync(resource.value);
          });
        })
        .andThen((resource) => {
          return resourceDBProvider.set({ ...resource, ownerGroupId: parsedInput.ownerGroupId });
        })
    );
  };
