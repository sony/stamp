import { UpdateResourceApproverInput } from "./input";

import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { parseZodObject } from "../../utils/neverthrow";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { errAsync, okAsync } from "neverthrow";
import { ResourceOnDB } from "@stamp-lib/stamp-types/models";
import { createCheckCanUpdateResourceApprover } from "../../events/resource/authz/canUpdateResourceApprove";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";

export const updateResourceApprover =
  (providers: {
    catalogDBProvider: CatalogDBProvider;
    catalogConfigProvider: CatalogConfigProvider;
    resourceDBProvider: ResourceDBProvider;
    getGroupMemberShip: GroupMemberShipProvider["get"];
  }) =>
  (input: UpdateResourceApproverInput) => {
    const { catalogDBProvider, catalogConfigProvider, resourceDBProvider, getGroupMemberShip } = providers;
    const getCatalogConfig = createGetCatalogConfig(catalogConfigProvider.get);
    const checkCanUpdateResourceApprover = createCheckCanUpdateResourceApprover(
      catalogDBProvider.getById,
      catalogConfigProvider.get,
      resourceDBProvider.getById,
      getGroupMemberShip
    );
    const parsedInputResult = parseZodObject(input, UpdateResourceApproverInput);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const parsedInput = parsedInputResult.value;

    return (
      getCatalogConfig(parsedInput)
        //TODO: validate groupId and UserId
        .andThen(checkCanUpdateResourceApprover)
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
          return resourceDBProvider.set({ ...resource, approverGroupId: parsedInput.approverGroupId });
        })
    );
  };
