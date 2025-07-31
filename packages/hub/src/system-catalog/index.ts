import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import {
  validateResourceUpdateRequest,
  executeResourceUpdateApproval,
  createCheckCanApproveResourceUpdate,
  errorHandlingForCancelUpdateResourceParamsWithApproval,
} from "./approval-flows/resource-update";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { createGetCatalogConfig } from "../events/catalog/catalogConfig";
import { createStampHubLogger } from "../logger";
import { ApprovedInput } from "@stamp-lib/stamp-types/catalogInterface/handler";

export interface StampSystemCatalogDependencies {
  resourceDBProvider: ResourceDBProvider;
  catalogConfigProvider: CatalogConfigProvider;
}

export function createStampSystemCatalog(deps: StampSystemCatalogDependencies): CatalogConfig {
  // Create necessary dependencies
  const getCatalogConfig = createGetCatalogConfig(deps.catalogConfigProvider.get);
  const checkCanApproveResourceUpdate = createCheckCanApproveResourceUpdate(deps.catalogConfigProvider, deps.resourceDBProvider);

  const validationDeps = {
    getCatalogConfig,
    checkCanApproveResourceUpdate,
  };

  const executeResourceUpdateApprovalFunc = (input: ApprovedInput) => {
    const logger = createStampHubLogger();
    const approvalDeps = {
      getCatalogConfig,
      checkCanApproveResourceUpdate,
      updatePendingUpdateParams: deps.resourceDBProvider.updatePendingUpdateParams,
      errorHandling: errorHandlingForCancelUpdateResourceParamsWithApproval({
        logger,
        updatePendingUpdateParams: deps.resourceDBProvider.updatePendingUpdateParams,
      }),
      logger,
    };
    return executeResourceUpdateApproval(approvalDeps)(input);
  };

  return {
    id: "stamp-system",
    name: "STAMP System",
    description: "Built-in STAMP system catalog for core resource management workflows",
    approvalFlows: [
      {
        id: "resource-update",
        name: "Resource Update Approval",
        description: "Built-in approval flow for resource update operations",
        inputParams: [
          {
            type: "string",
            id: "catalogId",
            name: "Catalog ID",
            required: true,
            description: "ID of the catalog to update",
          },
          {
            type: "string",
            id: "resourceTypeId",
            name: "Resource Type ID",
            required: true,
            description: "Type ID of the resource",
          },
          {
            type: "string",
            id: "resourceId",
            name: "Resource ID",
            required: true,
            description: "ID of the resource to update",
          },
          {
            type: "string",
            id: "updateParams",
            name: "Update Parameters",
            required: true,
            description: "Parameters for the resource update (JSON format)",
          },
        ],
        handlers: {
          approvalRequestValidation: validateResourceUpdateRequest(validationDeps),
          approved: executeResourceUpdateApprovalFunc,
          revoked: () => {
            throw new Error("Not implemented");
          },
        },
        approver: {
          approverType: "requestSpecified",
        },
        enableRevoke: false,
      },
    ],
    resourceTypes: [],
  };
}
