import { CatalogId, ResourceId, ResourceOnDB, ResourceTypeId } from "@stamp-lib/stamp-types/models";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../../error";

export type ListAllResourceOnDBByType = (input: { catalogId: CatalogId; resourceTypeId: ResourceTypeId }) => ResultAsync<Map<ResourceId, ResourceOnDB>, StampHubError>;

const MAX_RESOURCE_PAGES = 100;

/**
 * Load every ResourceOnDB row of a resource type into a Map keyed by resource id,
 * following pagination to the end. Rows exist only for resources with hub-side settings.
 */
export function createListAllResourceOnDBByType(listByResourceType: ResourceDBProvider["listByResourceType"]): ListAllResourceOnDBByType {
  const collect = (
    input: { catalogId: CatalogId; resourceTypeId: ResourceTypeId },
    paginationToken: string | undefined,
    acc: Map<ResourceId, ResourceOnDB>,
    page: number
  ): ResultAsync<Map<ResourceId, ResourceOnDB>, StampHubError> => {
    if (page >= MAX_RESOURCE_PAGES) {
      return errAsync(
        new StampHubError(`Too many resource pages for ${input.catalogId}/${input.resourceTypeId}`, "Unexpected error occurred", "INTERNAL_SERVER_ERROR")
      );
    }
    return listByResourceType({ ...input, limit: 200, paginationToken })
      .mapErr(convertStampHubError)
      .andThen((result) => {
        result.items.forEach((item) => acc.set(item.id, item));
        if (result.paginationToken) {
          return collect(input, result.paginationToken, acc, page + 1);
        }
        return okAsync(acc);
      });
  };
  return (input) => collect(input, undefined, new Map<ResourceId, ResourceOnDB>(), 0);
}
