import { none, some } from "@stamp-lib/stamp-option";
import { HandlerError, ResourceHandlers } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { CatalogConfig, ResourceOnDB, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, DBError, ResourceDBProvider, ResourceInput } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GetGroup, GroupMemberShipProvider, IdentityPluginError } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { err, ok, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateResourceRequesterGroupsInput } from "./input";
import { updateResourceRequesterGroups } from "./updateResourceRequesterGroups";

const requestUserId = "47f29c51-204c-09f6-2069-f3df073568c7"; // uuid is meaningless and was generated for testing.
const catalogOwnerGroupId = "0a3d8d5b-7a3f-4b2e-9c1d-2f4e6a8b0c1d";
const resourceOwnerGroupId = "96fc6a4c-b5d3-8c2b-0307-165168a023cd";
const parentOwnerGroupId = "5e8f1c2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b";
const requesterGroupA = "1f10d463-a2fe-c407-2b95-05b561346c8b";
const requesterGroupB = "7c2b9e4d-1a3f-4c5e-9b8a-6d5c4b3a2f1e";
const unknownGroupId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const resourceId = "112233445566";
const parentResourceId = "123456789012";
const catalogId = "test-catalog-id";
const resourceTypeId = "test-resource-type-id";
const parentResourceTypeId = "test-parent-resource-type-id";

const testResourceHandler: ResourceHandlers = {
  createResource: async () => err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR")),
  deleteResource: async () => err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR")),
  getResource: async () => ok(some({ params: {}, resourceId, name: "test-resource", parentResourceId })),
  listResources: async () => err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR")),
  updateResource: async () => err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR")),
  listResourceAuditItem: async () => err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR")),
};

const resourceTypeConfig: ResourceTypeConfig = {
  id: resourceTypeId,
  name: "test resource type",
  description: "test resource type",
  createParams: [],
  infoParams: [],
  handlers: testResourceHandler,
  isCreatable: false,
  isUpdatable: false,
  isDeletable: false,
  ownerManagement: true,
  approverManagement: true,
  parentResourceTypeId,
};

const catalogConfig: CatalogConfig = {
  id: catalogId,
  name: "test-catalog-name",
  description: "test-description",
  approvalFlows: [],
  resourceTypes: [resourceTypeConfig],
};

const catalogConfigProvider: CatalogConfigProvider = {
  get: () => okAsync(some(catalogConfig)),
};

const catalogDBProvider: CatalogDBProvider = {
  getById: () => okAsync(some({ id: catalogId, ownerGroupId: catalogOwnerGroupId })),
  listAll: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
  set: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
  delete: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
};

const existingResourceOnDB: ResourceOnDB = {
  id: resourceId,
  catalogId,
  resourceTypeId,
  ownerGroupId: resourceOwnerGroupId,
  approverGroupId: undefined,
};

function createResourceDBProvider(resourceRow: ResourceOnDB | undefined) {
  const set = vi.fn((resourceOnDB: ResourceOnDB) => okAsync(structuredClone(resourceOnDB)));
  const provider: ResourceDBProvider = {
    getById: vi.fn((input: ResourceInput) => {
      if (input.resourceTypeId === parentResourceTypeId && input.id === parentResourceId) {
        return okAsync(some({ id: parentResourceId, catalogId, resourceTypeId: parentResourceTypeId, ownerGroupId: parentOwnerGroupId }));
      }
      return okAsync(resourceRow === undefined ? none : some(structuredClone(resourceRow)));
    }),
    set,
    updatePendingUpdateParams: vi.fn(),
    delete: vi.fn(),
    createAuditNotification: vi.fn(),
    updateAuditNotification: vi.fn(),
    deleteAuditNotification: vi.fn(),
    listByResourceType: vi.fn(),
  };
  return { provider, set };
}

function createGroupMemberShip(memberOf: Array<string>): GroupMemberShipProvider["get"] {
  return vi.fn(({ groupId, userId }) =>
    okAsync(memberOf.includes(groupId) ? some({ groupId, userId, role: "member" as const, createdAt: "", updatedAt: "" }) : none)
  );
}

const existingGroups = [catalogOwnerGroupId, resourceOwnerGroupId, parentOwnerGroupId, requesterGroupA, requesterGroupB];
const getGroup: GetGroup = vi.fn(({ groupId }) =>
  okAsync(
    existingGroups.includes(groupId)
      ? some({ groupId, groupName: "g", description: "", createdAt: "", updatedAt: "" })
      : none
  )
);

const baseInput: UpdateResourceRequesterGroupsInput = {
  catalogId,
  resourceTypeId,
  resourceId,
  requesterGroupIds: [requesterGroupA, requesterGroupB],
  requestUserId,
};

describe("updateResourceRequesterGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["Catalog Owner", [catalogOwnerGroupId]],
    ["Resource Owner", [resourceOwnerGroupId]],
    ["Parent Resource Owner", [parentOwnerGroupId]],
  ])("%s can set requesterGroupIds", async (_label, memberOf) => {
    const { provider, set } = createResourceDBProvider(existingResourceOnDB);
    const result = await updateResourceRequesterGroups({
      catalogDBProvider,
      catalogConfigProvider,
      resourceDBProvider: provider,
      getGroupMemberShip: createGroupMemberShip(memberOf),
      getGroup,
    })(baseInput);
    if (result.isErr()) throw result.error;
    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({ ...existingResourceOnDB, requesterGroupIds: [requesterGroupA, requesterGroupB] });
    expect(result.value.requesterGroupIds).toEqual([requesterGroupA, requesterGroupB]);
  });

  it("returns FORBIDDEN for a user who is not catalog owner / resource owner / parent owner", async () => {
    const { provider, set } = createResourceDBProvider(existingResourceOnDB);
    const result = await updateResourceRequesterGroups({
      catalogDBProvider,
      catalogConfigProvider,
      resourceDBProvider: provider,
      getGroupMemberShip: createGroupMemberShip([requesterGroupA]),
      getGroup,
    })(baseInput);
    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("expected error");
    expect(result.error.code).toBe("FORBIDDEN");
    expect(set).not.toHaveBeenCalled();
  });

  it("clears the restriction when an empty array is given (stored as undefined)", async () => {
    const { provider, set } = createResourceDBProvider({ ...existingResourceOnDB, requesterGroupIds: [requesterGroupA] });
    const result = await updateResourceRequesterGroups({
      catalogDBProvider,
      catalogConfigProvider,
      resourceDBProvider: provider,
      getGroupMemberShip: createGroupMemberShip([resourceOwnerGroupId]),
      getGroup,
    })({ ...baseInput, requesterGroupIds: [] });
    if (result.isErr()) throw result.error;
    expect(set).toHaveBeenCalledWith({ ...existingResourceOnDB, requesterGroupIds: undefined });
    expect(getGroup).not.toHaveBeenCalled();
  });

  it("dedupes requesterGroupIds", async () => {
    const { provider, set } = createResourceDBProvider(existingResourceOnDB);
    const result = await updateResourceRequesterGroups({
      catalogDBProvider,
      catalogConfigProvider,
      resourceDBProvider: provider,
      getGroupMemberShip: createGroupMemberShip([resourceOwnerGroupId]),
      getGroup,
    })({ ...baseInput, requesterGroupIds: [requesterGroupA, requesterGroupA, requesterGroupB] });
    if (result.isErr()) throw result.error;
    expect(set).toHaveBeenCalledWith({ ...existingResourceOnDB, requesterGroupIds: [requesterGroupA, requesterGroupB] });
  });

  it("creates a skeleton row when the resource has no DB row yet", async () => {
    const { provider, set } = createResourceDBProvider(undefined);
    const result = await updateResourceRequesterGroups({
      catalogDBProvider,
      catalogConfigProvider,
      resourceDBProvider: provider,
      getGroupMemberShip: createGroupMemberShip([catalogOwnerGroupId]),
      getGroup,
    })({ ...baseInput, requesterGroupIds: [requesterGroupA] });
    if (result.isErr()) throw result.error;
    expect(set).toHaveBeenCalledWith({ id: resourceId, catalogId, resourceTypeId, requesterGroupIds: [requesterGroupA] });
  });

  it("returns BAD_REQUEST when more than 10 groups are given", async () => {
    const { provider, set } = createResourceDBProvider(existingResourceOnDB);
    const tooMany = Array.from({ length: 11 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    const result = await updateResourceRequesterGroups({
      catalogDBProvider,
      catalogConfigProvider,
      resourceDBProvider: provider,
      getGroupMemberShip: createGroupMemberShip([catalogOwnerGroupId]),
      getGroup,
    })({ ...baseInput, requesterGroupIds: tooMany });
    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("expected error");
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(set).not.toHaveBeenCalled();
  });

  it("returns BAD_REQUEST when a group does not exist", async () => {
    const { provider, set } = createResourceDBProvider(existingResourceOnDB);
    const result = await updateResourceRequesterGroups({
      catalogDBProvider,
      catalogConfigProvider,
      resourceDBProvider: provider,
      getGroupMemberShip: createGroupMemberShip([catalogOwnerGroupId]),
      getGroup,
    })({ ...baseInput, requesterGroupIds: [requesterGroupA, unknownGroupId] });
    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("expected error");
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(result.error.userMessage).toContain(unknownGroupId);
    expect(set).not.toHaveBeenCalled();
  });

  it("returns BAD_REQUEST when the resource does not exist in the catalog", async () => {
    const missingHandler: ResourceHandlers = { ...testResourceHandler, getResource: async () => ok(none) };
    const provider: CatalogConfigProvider = {
      get: () => okAsync(some({ ...catalogConfig, resourceTypes: [{ ...resourceTypeConfig, handlers: missingHandler }] })),
    };
    const { provider: resourceDBProvider, set } = createResourceDBProvider(existingResourceOnDB);
    const result = await updateResourceRequesterGroups({
      catalogDBProvider,
      catalogConfigProvider: provider,
      resourceDBProvider,
      getGroupMemberShip: createGroupMemberShip([catalogOwnerGroupId]),
      getGroup,
    })(baseInput);
    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("expected error");
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(set).not.toHaveBeenCalled();
  });

  it("propagates identity provider errors as StampHubError", async () => {
    const { provider } = createResourceDBProvider(existingResourceOnDB);
    const failingGetGroup: GetGroup = vi.fn(() => err(new IdentityPluginError("identity error")) as unknown as ReturnType<GetGroup>);
    const result = await updateResourceRequesterGroups({
      catalogDBProvider,
      catalogConfigProvider,
      resourceDBProvider: provider,
      getGroupMemberShip: createGroupMemberShip([catalogOwnerGroupId]),
      getGroup: failingGetGroup,
    })(baseInput);
    expect(result.isErr()).toBe(true);
  });
});
