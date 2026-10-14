import { none, some } from "@stamp-lib/stamp-option";
import { HandlerError, ResourceHandlers } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfig, ResourceOnDB, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { err, ok, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBuildRequestVisibility } from "./buildRequestVisibility";

const catalogId = "test-catalog-id";
const childTypeId = "child-type";
const parentTypeId = "parent-type";
const ownerGroupId = "96fc6a4c-b5d3-8c2b-0307-165168a023cd";
const approverGroupId = "18578bed-c45d-4f67-b9f7-10daf4c85f3f";
const requesterGroupId = "1f10d463-a2fe-c407-2b95-05b561346c8b";
const parentOwnerGroupId = "5e8f1c2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b";

const getResourceHandler = vi.fn();
const handlers: ResourceHandlers = {
  createResource: async () => err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR")),
  deleteResource: async () => err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR")),
  getResource: getResourceHandler,
  listResources: async () => err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR")),
  updateResource: async () => err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR")),
  listResourceAuditItem: async () => err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR")),
};
const baseType = { name: "t", description: "t", createParams: [], infoParams: [], handlers, isCreatable: false, isUpdatable: false, isDeletable: false, ownerManagement: true, approverManagement: true };
const childType: ResourceTypeConfig = { ...baseType, id: childTypeId, parentResourceTypeId: parentTypeId };
const parentType: ResourceTypeConfig = { ...baseType, id: parentTypeId };
const catalogConfig: CatalogConfig = { id: catalogId, name: "c", description: "c", approvalFlows: [], resourceTypes: [childType, parentType] };
const getCatalogConfigProvider = vi.fn().mockReturnValue(okAsync(some(catalogConfig)));

const rows: Record<string, ResourceOnDB> = {
  open: { id: "open", catalogId, resourceTypeId: parentTypeId, ownerGroupId },
  restrictedParent: { id: "restrictedParent", catalogId, resourceTypeId: parentTypeId, ownerGroupId, approverGroupId, visibility: "restricted" },
  restrictedChild: { id: "restrictedChild", catalogId, resourceTypeId: childTypeId, requesterGroupIds: [requesterGroupId, ownerGroupId], visibility: "restricted" },
  parentOfChild: { id: "parentOfChild", catalogId, resourceTypeId: parentTypeId, ownerGroupId: parentOwnerGroupId },
};
const getResourceById = vi.fn(({ id }: { id: string }) => okAsync(id in rows ? some(rows[id]) : none));

const request = (inputResources: Array<{ resourceTypeId: string; resourceId: string }>) => ({
  catalogId,
  approvalFlowId: "flow",
  inputResources,
  inputParams: [],
});

describe("createBuildRequestVisibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getResourceHandler.mockResolvedValue(ok(some({ resourceId: "restrictedChild", name: "n", params: {}, parentResourceId: "parentOfChild" })));
  });
  const build = createBuildRequestVisibility({ getResourceById, getCatalogConfigProvider });

  it("returns undefined when there are no resources", async () => {
    expect((await build(request([])))._unsafeUnwrap()).toBeUndefined();
    expect(getResourceById).not.toHaveBeenCalled();
  });

  it("returns undefined when no resource is restricted and does not call the handler", async () => {
    const result = await build(request([{ resourceTypeId: parentTypeId, resourceId: "open" }, { resourceTypeId: parentTypeId, resourceId: "no-row" }]));
    expect(result._unsafeUnwrap()).toBeUndefined();
    expect(getResourceHandler).not.toHaveBeenCalled();
  });

  it("collects owner / approver groups of a restricted resource without a parent type", async () => {
    const result = await build(request([{ resourceTypeId: parentTypeId, resourceId: "restrictedParent" }]));
    expect(result._unsafeUnwrap()).toEqual({ type: "restricted", viewerGroupIds: [ownerGroupId, approverGroupId] });
    expect(getResourceHandler).not.toHaveBeenCalled();
  });

  it("adds requester groups and the parent owner group for a restricted child, deduped", async () => {
    const result = await build(request([{ resourceTypeId: childTypeId, resourceId: "restrictedChild" }, { resourceTypeId: parentTypeId, resourceId: "restrictedParent" }]));
    const visibility = result._unsafeUnwrap();
    expect(visibility?.type).toBe("restricted");
    expect(new Set(visibility?.viewerGroupIds)).toEqual(new Set([requesterGroupId, ownerGroupId, approverGroupId, parentOwnerGroupId]));
    expect(visibility?.viewerGroupIds.length).toBe(4);
    expect(getResourceHandler).toHaveBeenCalledTimes(1);
    expect(getResourceHandler).toHaveBeenCalledWith({ resourceTypeId: childTypeId, resourceId: "restrictedChild" });
  });

  it("uses inputParams for stamp-system/resource-update requests", async () => {
    const result = await build({
      catalogId: "stamp-system",
      approvalFlowId: "resource-update",
      inputResources: [],
      inputParams: [
        { id: "catalogId", value: catalogId },
        { id: "resourceTypeId", value: parentTypeId },
        { id: "resourceId", value: "restrictedParent" },
      ],
    });
    expect(result._unsafeUnwrap()).toEqual({ type: "restricted", viewerGroupIds: [ownerGroupId, approverGroupId] });
  });

  it("ignores a missing parent", async () => {
    getResourceHandler.mockResolvedValue(ok(some({ resourceId: "restrictedChild", name: "n", params: {} })));
    const result = await build(request([{ resourceTypeId: childTypeId, resourceId: "restrictedChild" }]));
    expect(result._unsafeUnwrap()).toEqual({ type: "restricted", viewerGroupIds: [requesterGroupId, ownerGroupId] });
  });
});
