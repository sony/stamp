import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResourceOutline } from "@stamp-lib/stamp-types/models";
import { ResultAsync, errAsync } from "neverthrow";
import z from "zod";
import { StampHubError, convertStampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { convertPromiseResultToResultAsync, parseZodObject } from "../../utils/neverthrow";
import { ListResourceOutlinesInput } from "./input";

export const ListResourceOutlinesOutput = z.object({
  items: z.array(ResourceOutline),
  paginationToken: z.string().optional(),
});
export type ListResourceOutlinesOutput = z.infer<typeof ListResourceOutlinesOutput>;

export const listResourceOutlines =
  (providers: { catalogConfigProvider: CatalogConfigProvider }) =>
  (input: ListResourceOutlinesInput): ResultAsync<ListResourceOutlinesOutput, StampHubError> => {
    const { catalogConfigProvider } = providers;
    const getCatalogConfig = createGetCatalogConfig(catalogConfigProvider.get);

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
        );
      })

      .map((listResourcesResult) => {
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
        return { items: resourceOutlines, paginationToken: listResourcesResult.paginationToken };
      })
      .mapErr(convertStampHubError);
  };
