import { CreateResourceInput } from "./input";

import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResourceInfo } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { createCheckCanCreateResource } from "../../events/resource/authz/canCreateResource";
import { convertPromiseResultToResultAsync, parseZodObject } from "../../utils/neverthrow";

export const createResource =
  (providers: {
    catalogDBProvider: CatalogDBProvider;
    catalogConfigProvider: CatalogConfigProvider;
    resourceDBProvider: ResourceDBProvider;
    getGroupMemberShip: GroupMemberShipProvider["get"];
  }) =>
  (input: CreateResourceInput): ResultAsync<ResourceInfo, StampHubError> => {
    const { catalogDBProvider, catalogConfigProvider, resourceDBProvider, getGroupMemberShip } = providers;
    const getCatalogConfig = createGetCatalogConfig(catalogConfigProvider.get);
    const checkCanCreateResource = createCheckCanCreateResource(
      catalogDBProvider.getById,
      catalogConfigProvider.get,
      resourceDBProvider.getById,
      getGroupMemberShip
    );

    const parsedInputResult = parseZodObject(input, CreateResourceInput);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const parsedInput = parsedInputResult.value;

    return (
      getCatalogConfig(parsedInput)
        //TODO: validate groupId and UserId
        .andThen(checkCanCreateResource)
        .andThen(getResourceTypeConfig)
        .andThen((extendInput) => {
          return convertPromiseResultToResultAsync()(
            extendInput.resourceTypeConfig.handlers.createResource({
              resourceTypeId: extendInput.resourceTypeConfig.id,
              inputParams: parsedInput.inputParams,
              parentResourceId: parsedInput.parentResourceId,
            })
          );
        })
        .andThen((resource) => {
          if (!parsedInput.approverGroupId && !parsedInput.ownerGroupId) {
            // If approverGroupId and ownerGroupId are undefined, do not register to DB. (e.g. Unicorn)
            return okAsync({ id: resource.resourceId, ...parsedInput, ...resource });
          }
          return resourceDBProvider.set({ ...parsedInput, id: resource.resourceId }).map((resourceOnDB) => {
            return { ...resourceOnDB, ...resource };
          });
        })
        .mapErr(convertStampHubError)
    );
  };
