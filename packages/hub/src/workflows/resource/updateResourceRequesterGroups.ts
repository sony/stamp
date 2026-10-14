import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResourceOnDB } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GetGroup, GroupId, GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { createCheckCanEditResource } from "../../events/resource/authz/canEditResource";
import { parseZodObject } from "../../utils/neverthrow";
import { UpdateResourceRequesterGroupsInput } from "./input";
import { normalizeRequesterGroupIds } from "./normalizeResourceAccessSettings";

/**
 * Set the groups whose members may submit approval requests for the resource.
 * Allowed for Catalog Owner / Resource Owner / Parent Resource Owner (same as other resource edits).
 * An empty array clears the restriction.
 */
export const updateResourceRequesterGroups =
  (providers: {
    catalogDBProvider: CatalogDBProvider;
    catalogConfigProvider: CatalogConfigProvider;
    resourceDBProvider: ResourceDBProvider;
    getGroupMemberShip: GroupMemberShipProvider["get"];
    getGroup: GetGroup;
  }) =>
  (input: UpdateResourceRequesterGroupsInput): ResultAsync<ResourceOnDB, StampHubError> => {
    const { catalogDBProvider, catalogConfigProvider, resourceDBProvider, getGroupMemberShip, getGroup } = providers;
    const getCatalogConfig = createGetCatalogConfig(catalogConfigProvider.get);
    const checkCanEditResource = createCheckCanEditResource(catalogDBProvider.getById, catalogConfigProvider.get, resourceDBProvider.getById, getGroupMemberShip);

    const parsedInputResult = parseZodObject(input, UpdateResourceRequesterGroupsInput);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const parsedInput = parsedInputResult.value;
    const requesterGroupIds = normalizeRequesterGroupIds(parsedInput.requesterGroupIds);

    const validateGroupsExist = (groupIds: Array<GroupId>): ResultAsync<void, StampHubError> => {
      return ResultAsync.combine(groupIds.map((groupId) => getGroup({ groupId }).map((group) => ({ groupId, exists: group.isSome() }))))
        .mapErr(convertStampHubError)
        .andThen((results) => {
          const missing = results.filter((r) => !r.exists).map((r) => r.groupId);
          if (missing.length > 0) {
            return errAsync(new StampHubError(`Group not found: ${missing.join(", ")}`, `Group not found: ${missing.join(", ")}`, "BAD_REQUEST"));
          }
          return okAsync(undefined);
        });
    };

    return getCatalogConfig(parsedInput)
      .andThen(checkCanEditResource)
      .andThen(getResourceTypeConfig)
      .andThen((extendInput) => validateGroupsExist(requesterGroupIds ?? []).map(() => extendInput))
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
      .andThen((resource) => resourceDBProvider.set({ ...resource, requesterGroupIds }))
      .mapErr(convertStampHubError);
  };
