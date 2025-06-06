import { GetResourceInfoInput } from "./input";

import { Option } from "@stamp-lib/stamp-option";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResourceInfo } from "@stamp-lib/stamp-types/models";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ResultAsync } from "neverthrow";
import { convertStampHubError, StampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { createValidateCatalogId } from "../../events/catalog/validation";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { validateResourceTypeId } from "../../events/resource-type/validation";
import { createGetResourceInfo } from "../../events/resource/info/get";
import { parseZodObjectAsync } from "../../utils/neverthrow";

export type GetResourceInfo = (input: GetResourceInfoInput) => ResultAsync<Option<ResourceInfo>, StampHubError>;
export const getResourceInfo = (providers: {
  getCatalogConfigProvider: CatalogConfigProvider["get"];
  getResourceDBProvider: ResourceDBProvider["getById"];
}): GetResourceInfo => {
  return (input: GetResourceInfoInput): ResultAsync<Option<ResourceInfo>, StampHubError> => {
    const { getCatalogConfigProvider, getResourceDBProvider } = providers;
    const validateCatalogId = createValidateCatalogId(getCatalogConfigProvider);
    const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);
    const getResourceInfoEvent = createGetResourceInfo(getResourceDBProvider);
    return parseZodObjectAsync(input, GetResourceInfoInput)
      .andThen(validateCatalogId)
      .andThen(getCatalogConfig)
      .andThen(validateResourceTypeId)
      .andThen(getResourceTypeConfig)
      .andThen(getResourceInfoEvent)
      .mapErr(convertStampHubError);
  };
};
