import { ApprovalRequestInputParam, ApprovalRequestInputResource, CatalogId, ResourceId, ResourceTypeId } from "@stamp-lib/stamp-types/models";

export type ResourceRef = { catalogId: CatalogId; resourceTypeId: ResourceTypeId; resourceId: ResourceId };

export type ApprovalRequestResourcesSource = {
  catalogId: CatalogId;
  approvalFlowId: string;
  inputResources: Array<ApprovalRequestInputResource>;
  inputParams: Array<ApprovalRequestInputParam>;
};

export const SYSTEM_CATALOG_ID = "stamp-system";
export const RESOURCE_UPDATE_APPROVAL_FLOW_ID = "resource-update";

/**
 * Resources a request refers to for requester authorization: the request's inputResources.
 */
export function inputResourcesOfApprovalRequest(request: Pick<ApprovalRequestResourcesSource, "catalogId" | "inputResources">): Array<ResourceRef> {
  return request.inputResources.map((resource) => ({
    catalogId: request.catalogId,
    resourceTypeId: resource.resourceTypeId,
    resourceId: resource.resourceId,
  }));
}

/**
 * Resources a request refers to for visibility purposes.
 * In addition to inputResources, the built-in "stamp-system/resource-update" flow carries its target resource in inputParams.
 */
export function resourcesOfApprovalRequest(request: ApprovalRequestResourcesSource): Array<ResourceRef> {
  const refs = inputResourcesOfApprovalRequest(request);
  if (request.catalogId === SYSTEM_CATALOG_ID && request.approvalFlowId === RESOURCE_UPDATE_APPROVAL_FLOW_ID) {
    const param = (id: string) => {
      const value = request.inputParams.find((p) => p.id === id)?.value;
      return typeof value === "string" && value.length > 0 ? value : undefined;
    };
    const catalogId = param("catalogId");
    const resourceTypeId = param("resourceTypeId");
    const resourceId = param("resourceId");
    if (catalogId && resourceTypeId && resourceId) {
      refs.push({ catalogId, resourceTypeId, resourceId });
    }
  }
  return refs;
}
