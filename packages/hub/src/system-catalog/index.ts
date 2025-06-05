import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { validateResourceUpdateRequest, executeResourceUpdateApproval } from "./approval-flows/resource-update";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";

export interface StampSystemCatalogDependencies {
  resourceDBProvider: ResourceDBProvider;
  catalogConfigProvider: CatalogConfigProvider;
}

export function createStampSystemCatalog(deps: StampSystemCatalogDependencies): CatalogConfig {
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
            id: "catalogName",
            name: "Catalog Name",
            required: true,
            description: "Name of the catalog to update",
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
            id: "resourceTypeName",
            name: "Resource Type Name",
            required: true,
            description: "Name of the resource type",
          },
          {
            type: "string",
            id: "resourceName",
            name: "Resource Name",
            required: true,
            description: "Name of the resource to update",
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
            id: "resourceName",
            name: "Resource Name",
            required: true,
            description: "Name of the resource to update",
          },
          {
            type: "string",
            id: "updateParams",
            name: "Update Parameters",
            required: true,
            description: "Parameters for the resource update (JSON format)",
          },
          {
            type: "string",
            id: "comment",
            name: "Comment",
            required: false,
            description: "Comment for the approval request",
          },
        ],
        handlers: {
          approvalRequestValidation: validateResourceUpdateRequest(deps),
          approved: executeResourceUpdateApproval(deps),
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
