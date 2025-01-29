import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { z } from "zod";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { ResourceTypeId, CatalogConfig } from "@stamp-lib/stamp-types/models";

export const ValidateResourceTypeIdInput = z.object({
  catalogConfig: CatalogConfig,
  resourceTypeId: ResourceTypeId,
});
export type ValidateResourceTypeIdInput = z.infer<typeof ValidateResourceTypeIdInput>;

export type ValidateResourceTypeId = <T extends ValidateResourceTypeIdInput>(input: T) => ResultAsync<T, StampHubError>;

export function validateResourceTypeId<T extends ValidateResourceTypeIdInput>(input: T): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, ValidateResourceTypeIdInput)
    .andThen((parsedInput) => {
      const resourceType = parsedInput.catalogConfig.resourceTypes.find((resourceType) => resourceType.id === parsedInput.resourceTypeId);
      if (resourceType != undefined) {
        return okAsync(input);
      } else {
        return errAsync(new StampHubError("ResourceType not found", "ResourceType Not Found", "NOT_FOUND"));
      }
    })
    .mapErr(convertStampHubError);
}
