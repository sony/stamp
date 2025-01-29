import { convertPromiseResultToResultAsync, parseZodObjectAsync } from "../../../utils/neverthrow";

import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ResultAsync, okAsync } from "neverthrow";
import { CatalogId, ResourceId, ResourceInfo, ResourceTypeConfig, ResourceTypeId } from "@stamp-lib/stamp-types/models";

import { Option, none, some } from "@stamp-lib/stamp-option";
import { z } from "zod";
import { StampHubError, convertStampHubError } from "../../../error";

export const GetResourceInfoInput = z.object({
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
  resourceTypeConfig: ResourceTypeConfig,
});
export type GetResourceInfoInput = z.infer<typeof GetResourceInfoInput>;

export function getResourceInfoImpl(
  input: GetResourceInfoInput,
  getResourceDBProvider: ResourceDBProvider["getById"]
): ResultAsync<Option<ResourceInfo>, StampHubError> {
  return parseZodObjectAsync(input, GetResourceInfoInput)
    .andThen((parsedInput) => {
      const callGetResourceHandlerResult = convertPromiseResultToResultAsync()(
        parsedInput.resourceTypeConfig.handlers.getResource({ resourceTypeId: parsedInput.resourceTypeConfig.id, resourceId: parsedInput.resourceId })
      );
      const getResourceResult = getResourceDBProvider({
        id: parsedInput.resourceId,
        catalogId: parsedInput.catalogId,
        resourceTypeId: parsedInput.resourceTypeId,
      });

      return ResultAsync.combine([callGetResourceHandlerResult, getResourceResult]).andThen(([resource, resourceOnDB]) => {
        if (resource.isNone()) {
          return okAsync(none);
        }
        if (resourceOnDB.isNone()) {
          return okAsync(
            some({
              ...resource.value,
              id: resource.value.resourceId,
              catalogId: parsedInput.catalogId,
              resourceTypeId: parsedInput.resourceTypeId,
              parentResourceTypeId: parsedInput.resourceTypeConfig.parentResourceTypeId,
            })
          );
        }
        return okAsync(
          some({
            ...resource.value,
            ...resourceOnDB.value,
            id: resource.value.resourceId,
            catalogId: parsedInput.catalogId,
            resourceTypeId: parsedInput.resourceTypeId,
            parentResourceTypeId: parsedInput.resourceTypeConfig.parentResourceTypeId,
          })
        );
      });
    })
    .mapErr(convertStampHubError);
}

export function createGetResourceInfo(
  getResourceDBProvider: ResourceDBProvider["getById"]
): (input: GetResourceInfoInput) => ResultAsync<Option<ResourceInfo>, StampHubError> {
  return (input) => getResourceInfoImpl(input, getResourceDBProvider);
}
