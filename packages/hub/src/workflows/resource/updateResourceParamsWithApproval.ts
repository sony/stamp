import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { Logger } from "@stamp-lib/stamp-logger";
import { UpdateResourceParamsWithApprovalInput } from "./input";

import { errAsync, okAsync, ResultAsync } from "neverthrow";

import { convertStampHubError, StampHubError } from "../../error";

import { getResourceInfo } from "./getResourceInfo";
import { getResourceTypeInfo } from "../resource-type/getResourceTypeInfo";
import { SubmitWorkflow } from "../approval-request/submit";

export const updateResourceParamsWithApproval =
  (providers: { catalogConfigProvider: CatalogConfigProvider; resourceDBProvider: ResourceDBProvider; submitWorkflow: SubmitWorkflow; logger: Logger }) =>
  (input: UpdateResourceParamsWithApprovalInput): ResultAsync<{ approvalRequestId: string }, StampHubError> => {
    const { resourceDBProvider, logger, catalogConfigProvider, submitWorkflow } = providers;

    const getResourceInfoFunc = getResourceInfo({
      getCatalogConfigProvider: catalogConfigProvider["get"],
      getResourceDBProvider: resourceDBProvider["getById"],
    });

    const getResourceTypeInfoResult = getResourceTypeInfo(
      {
        catalogId: input.catalogId,
        resourceTypeId: input.resourceTypeId,
        requestUserId: input.requestUserId,
      },
      catalogConfigProvider
    ).andThen((resourceTypeInfo) => {
      if (resourceTypeInfo.isUpdatable === false && !resourceTypeInfo.updateApprover) {
        return errAsync(new StampHubError("Resource type is not updatable", "ResourceType Not Updatable", "BAD_REQUEST"));
      }
      return okAsync(resourceTypeInfo);
    });

    const getResourceDBResult = resourceDBProvider.getById({
      id: input.resourceId,
      catalogId: input.catalogId,
      resourceTypeId: input.resourceTypeId,
    });

    const getResourceInfoResult = getResourceInfo({
      getCatalogConfigProvider: catalogConfigProvider["get"],
      getResourceDBProvider: resourceDBProvider["getById"],
    })(input);

    const getResourceResult = ResultAsync.combine([getResourceDBResult, getResourceInfoResult]).andThen(([resourceDBOpt, resourceInfoOpt]) => {
      if (resourceInfoOpt.isNone()) {
        return errAsync(new StampHubError("Resource not found", "Resource Not Found", "NOT_FOUND"));
      }
      if (resourceDBOpt.isNone()) {
        // Create a new resource if it does not exist for call resourceDBProvider.updatePendingUpdateParams
        const newResource = {
          id: input.resourceId,
          catalogId: input.catalogId,
          resourceTypeId: input.resourceTypeId,
        };
        return resourceDBProvider.set(newResource).andThen(() => {
          return okAsync(resourceInfoOpt.value);
        });
      }
      return okAsync(resourceInfoOpt.value);
    });

    // Check if the resource exists and resourceType has is not already pending an update
    const approverGroupIdResult = ResultAsync.combine([getResourceTypeInfoResult, getResourceResult]).andThen(([resourceTypeInfo, resource]) => {
      if (resource.pendingUpdateParams) {
        return errAsync(new StampHubError("Resource already has a pending update params request", "Resource Pending Update", "CONFLICT"));
      }
      if (!resourceTypeInfo.isUpdatable) {
        return errAsync(new StampHubError("Resource type is not updatable", "Resource Type Not Updatable", "BAD_REQUEST"));
      }

      if (resourceTypeInfo.updateApprover?.approverType === "this") {
        return errAsync(new StampHubError("Approver type is 'this'", "Approver type is 'this'", "BAD_REQUEST"));
      }

      if (resourceTypeInfo.updateApprover?.approverType === "parentResource") {
        // If approverManagement is enabled, use the resourceType's approverGroupId
        return getResourceInfoFunc({
          catalogId: input.catalogId,
          resourceTypeId: resourceTypeInfo.parentResourceTypeId ?? "",
          resourceId: resource.parentResourceId ?? "",
          requestUserId: input.requestUserId,
        }).andThen((parentResourceOpt) => {
          if (parentResourceOpt.isNone()) {
            return errAsync(new StampHubError("Parent resource not found", "Parent Resource Not Found", "BAD_REQUEST"));
          }
          const parentResource = parentResourceOpt.value;
          if (!parentResource.approverGroupId) {
            return errAsync(new StampHubError("Parent resource does not have an approver group", "Parent Resource No Approver Group", "BAD_REQUEST"));
          }
          return okAsync(parentResource.approverGroupId);
        });
      } else {
        // If neither is set, return an error
        return errAsync(new StampHubError("Resource type does not have an approver group", "Resource Type No Approver Group", "BAD_REQUEST"));
      }
    });

    const stampSystemCatalogResult = catalogConfigProvider.get("stamp-system").andThen((catalogConfig) => {
      if (catalogConfig.isNone()) {
        return errAsync(new StampHubError("Failed to get stamp-system catalog config", "Internal server error", "INTERNAL_SERVER_ERROR"));
      }
      return okAsync(catalogConfig.value);
    });

    const submitWorkflowResult = ResultAsync.combine([approverGroupIdResult, stampSystemCatalogResult]).andThen(([approverGroupId, stampSystemCatalog]) => {
      const resourceUpdateFlow = stampSystemCatalog.approvalFlows.find((flow) => flow.id === "resource-update");
      if (!resourceUpdateFlow) {
        return errAsync(new StampHubError("Resource update approval flow not found", "Internal server error", "INTERNAL_SERVER_ERROR"));
      }
      return submitWorkflow({
        catalogId: "stamp-system", // Use built-in catalog
        approvalFlowId: "resource-update", // Use built-in ApprovalFlow
        requestUserId: input.requestUserId,
        inputParams: [
          {
            id: "catalogId",
            value: input.catalogId,
          },
          {
            id: "resourceTypeId",
            value: input.resourceTypeId,
          },
          {
            id: "resourceId",
            value: input.resourceId,
          },
          {
            id: "updateParams",
            value: JSON.stringify(input.updateParams),
          },
        ],
        inputResources: [],
        approverType: "group",
        approverId: approverGroupId,
        requestComment: input.comment ?? "",
      });
    });

    return submitWorkflowResult
      .andThen((approvalRequest) => {
        logger.info(`Approval request created with ID: ${approvalRequest.requestId}`);

        return resourceDBProvider
          .updatePendingUpdateParams({
            id: input.resourceId,
            catalogId: input.catalogId,
            resourceTypeId: input.resourceTypeId,
            pendingUpdateParams: {
              approvalRequestId: approvalRequest.requestId,
              updateParams: input.updateParams,
              requestUserId: input.requestUserId,
              requestedAt: approvalRequest.requestDate,
            },
          })
          .map(() => ({ approvalRequestId: approvalRequest.requestId }));
      })
      .mapErr((error) => {
        logger.error(`Failed to update pending update params: ${error.message}`);
        return convertStampHubError(error);
      });
  };
