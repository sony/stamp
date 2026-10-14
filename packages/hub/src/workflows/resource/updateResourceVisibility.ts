import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResourceOnDB } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, errAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { createCheckCanEditResource } from "../../events/resource/authz/canEditResource";
import { parseZodObject } from "../../utils/neverthrow";
import { UpdateResourceVisibilityInput } from "./input";
import { normalizeVisibility } from "./normalizeResourceAccessSettings";

/**
 * Set who can see the resource ("all" | "restricted").
 * Allowed for Catalog Owner / Resource Owner / Parent Resource Owner (same as other resource edits).
 */
export const updateResourceVisibility =
  (providers: {
    catalogDBProvider: CatalogDBProvider;
    catalogConfigProvider: CatalogConfigProvider;
    resourceDBProvider: ResourceDBProvider;
    getGroupMemberShip: GroupMemberShipProvider["get"];
  }) =>
  (input: UpdateResourceVisibilityInput): ResultAsync<ResourceOnDB, StampHubError> => {
    const { catalogDBProvider, catalogConfigProvider, resourceDBProvider, getGroupMemberShip } = providers;
    const getCatalogConfig = createGetCatalogConfig(catalogConfigProvider.get);
    const checkCanEditResource = createCheckCanEditResource(catalogDBProvider.getById, catalogConfigProvider.get, resourceDBProvider.getById, getGroupMemberShip);

    const parsedInputResult = parseZodObject(input, UpdateResourceVisibilityInput);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const parsedInput = parsedInputResult.value;
    const visibility = normalizeVisibility(parsedInput.visibility);

    return getCatalogConfig(parsedInput)
      .andThen(checkCanEditResource)
      .andThen(getResourceTypeConfig)
      .andThen((extendInput) => {
        return resourceDBProvider
          .getById({
            id: parsedInput.resourceId,
            catalogId: parsedInput.catalogId,
            resourceTypeId: extendInput.resourceTypeConfig.id,
          })
          .map((resource): ResourceOnDB => {
            if (resource.isNone()) {
              return { id: extendInput.resourceId, catalogId: extendInput.catalogId, resourceTypeId: extendInput.resourceTypeId };
            }
            return resource.value;
          });
      })
      .andThen((resource) => resourceDBProvider.set({ ...resource, visibility }))
      .mapErr(convertStampHubError);
  };
