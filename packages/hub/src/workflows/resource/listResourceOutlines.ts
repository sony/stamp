import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResourceOutline } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import z from "zod";
import { StampHubError, convertStampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { createPrepareResourceVisibilityFilter } from "../../events/resource/visibility/canViewResource";
import { convertPromiseResultToResultAsync, parseZodObject } from "../../utils/neverthrow";
import { ListResourceOutlinesInput } from "./input";

export const ListResourceOutlinesOutput = z.object({
  // Resources the request user is not allowed to see (visibility: "restricted") are filtered out.
  // A page may therefore contain fewer items than the catalog returned, or even none, while paginationToken is still set.
  items: z.array(ResourceOutline),
  paginationToken: z.string().optional(),
});
export type ListResourceOutlinesOutput = z.infer<typeof ListResourceOutlinesOutput>;

export const listResourceOutlines =
  (providers: {
    catalogConfigProvider: CatalogConfigProvider;
    catalogDBProvider: CatalogDBProvider;
    resourceDBProvider: ResourceDBProvider;
    listGroupMemberShipByUser: GroupMemberShipProvider["listByUser"];
  }) =>
  (input: ListResourceOutlinesInput): ResultAsync<ListResourceOutlinesOutput, StampHubError> => {
    const { catalogConfigProvider, catalogDBProvider, resourceDBProvider, listGroupMemberShipByUser } = providers;
    const getCatalogConfig = createGetCatalogConfig(catalogConfigProvider.get);
    const prepareVisibilityFilter = createPrepareResourceVisibilityFilter({
      listResourceByResourceType: resourceDBProvider.listByResourceType,
      getCatalogDB: catalogDBProvider.getById,
      listGroupMemberShipByUser,
    });

    const parsedInputResult = parseZodObject(input, ListResourceOutlinesInput);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const parsedInput = parsedInputResult.value;

    return getCatalogConfig(parsedInput)
      .andThen(getResourceTypeConfig)
      .andThen((extendInput) => {
        return convertPromiseResultToResultAsync()(
          extendInput.resourceTypeConfig.handlers.listResources({
            resourceTypeId: extendInput.resourceTypeId,
            parentResourceId: extendInput.parentResourceId,
            prefix: extendInput.prefix,
            paginationToken: extendInput.paginationToken,
          })
        ).map((listResourcesResult) => ({ ...extendInput, listResourcesResult }));
      })
      .andThen((extendInput) => {
        const { listResourcesResult, resourceTypeConfig } = extendInput;
        const resourceOutlines: Array<ResourceOutline> = listResourcesResult.resources.map((resource) => {
          return {
            id: resource.resourceId,
            name: resource.name,
            catalogId: input.catalogId,
            resourceTypeId: input.resourceTypeId,
            params: resource.params,
            parentResourceId: resource.parentResourceId,
          };
        });
        if (resourceOutlines.length === 0) {
          return okAsync({ items: resourceOutlines, paginationToken: listResourcesResult.paginationToken });
        }
        // Hide resources with visibility "restricted" from users who are not catalog owner / owner / approver / requester / parent owner.
        return prepareVisibilityFilter({
          requestUserId: parsedInput.requestUserId,
          catalogId: parsedInput.catalogId,
          resourceTypeId: parsedInput.resourceTypeId,
          parentResourceTypeId: resourceTypeConfig.parentResourceTypeId,
        }).map((isVisible) => ({
          items: resourceOutlines.filter((outline) => isVisible({ id: outline.id, parentResourceId: outline.parentResourceId })),
          paginationToken: listResourcesResult.paginationToken,
        }));
      })
      .mapErr(convertStampHubError);
  };
