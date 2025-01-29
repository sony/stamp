import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { z } from "zod";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { ResourceTypeId, CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";

export const GetResourceTypeConfigInput = z.object({
  catalogConfig: CatalogConfig,
  resourceTypeId: ResourceTypeId,
});
export type GetResourceTypeConfigInput = z.infer<typeof GetResourceTypeConfigInput>;

export type GetResourceTypeConfig = <T extends GetResourceTypeConfigInput>(
  input: T
) => ResultAsync<T & { resourceTypeConfig: ResourceTypeConfig }, StampHubError>;

export function getResourceTypeConfig<T extends GetResourceTypeConfigInput>(
  input: T
): ResultAsync<T & { resourceTypeConfig: ResourceTypeConfig }, StampHubError> {
  return parseZodObjectAsync(input, GetResourceTypeConfigInput)
    .andThen((parsedInput) => {
      const resourceTypeConfig = parsedInput.catalogConfig.resourceTypes.find((resourceType) => resourceType.id === parsedInput.resourceTypeId);
      if (resourceTypeConfig != undefined) {
        return okAsync({ ...input, resourceTypeConfig });
      } else {
        return errAsync(new StampHubError("ResourceType not found", "ResourceType Not Found", "NOT_FOUND"));
      }
    })
    .mapErr(convertStampHubError);
}
