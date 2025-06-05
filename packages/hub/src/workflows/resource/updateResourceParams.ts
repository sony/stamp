import { UpdateResourceParamsInput } from "./input";

import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";

import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../error";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { getResourceTypeConfig } from "../../events/resource-type/resourceTypeConfig";
import { CheckCanEditResource } from "../../events/resource/authz/canEditResource";
import { convertPromiseResultToResultAsync, parseZodObject } from "../../utils/neverthrow";
import { ResourceParams } from "@stamp-lib/stamp-types/models";

export const updateResourceParams =
  (providers: { catalogConfigProvider: CatalogConfigProvider; checkCanEditResource: CheckCanEditResource }) =>
  (input: UpdateResourceParamsInput): ResultAsync<ResourceParams, StampHubError> => {
    const { catalogConfigProvider, checkCanEditResource } = providers;
    const getCatalogConfig = createGetCatalogConfig(catalogConfigProvider.get);

    const parsedInputResult = parseZodObject(input, UpdateResourceParamsInput);
    if (parsedInputResult.isErr()) {
      return errAsync(parsedInputResult.error);
    }
    const parsedInput = parsedInputResult.value;

    return (
      getCatalogConfig(parsedInput)
        //TODO: validate groupId and UserId
        .andThen(checkCanEditResource)
        .andThen(getResourceTypeConfig)
        .andThen((extendInput) => {
          if (extendInput.resourceTypeConfig.isUpdatable !== true) {
            return errAsync(new StampHubError("Resource type is not updatable", "ResourceType Not Updatable", "BAD_REQUEST"));
          }

          if (extendInput.resourceTypeConfig.updateApprover?.approverType !== "this") {
            return errAsync(new StampHubError("Resource type is not updatable by this user", "ResourceType Not Updatable", "BAD_REQUEST"));
          }

          return convertPromiseResultToResultAsync()(
            extendInput.resourceTypeConfig.handlers.updateResource({
              resourceId: extendInput.resourceId,
              updateParams: extendInput.updateParams,
              resourceTypeId: extendInput.resourceTypeId,
            })
          );
        })
        .andThen((resource) => {
          return okAsync<ResourceParams>({
            ...resource.params,
          });
        })
        .mapErr(convertStampHubError)
    );
  };
