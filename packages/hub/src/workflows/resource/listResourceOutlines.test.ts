import { some } from "@stamp-lib/stamp-option";
import { HandlerError, ResourceHandlers } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, DBError, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider, IdentityPluginError } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { vi } from "vitest";
import { err, ok, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import { ListResourceOutlinesInput } from "./input";
import { listResourceOutlines } from "./listResourceOutlines";

const requestUserId = "47f29c51-204c-09f6-2069-f3df073568c7"; // The uuid is meaningless and was generated for testing.

const resourceName = "test-resource";
const resourceId = "112233445566";
const parentResourceId = "123456789012";
const paginationToken = "abc123";

const testResourceHandler: ResourceHandlers = {
  createResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  deleteResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  getResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  listResources: async () => {
    return ok({
      resources: [{ params: {}, name: resourceName, resourceId: resourceId, parentResourceId: parentResourceId }],
      paginationToken: paginationToken,
    });
  },
  updateResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  listResourceAuditItem: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
};

const testEmptyResourceHandler: ResourceHandlers = {
  createResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  deleteResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  getResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  listResources: async () => {
    return ok({
      resources: [],
    });
  },
  updateResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  listResourceAuditItem: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
};

const testResourceTypeConfig: ResourceTypeConfig = {
  id: "test-resource-type-id",
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
};

const testEmptyResourceTypeConfig: ResourceTypeConfig = {
  id: "test-resource-type-id",
  name: "test resource type",
  description: "test resource type",
  createParams: [],
  infoParams: [],
  handlers: testEmptyResourceHandler,
  isCreatable: false,
  isUpdatable: false,
  isDeletable: false,
  ownerManagement: true,
  approverManagement: true,
};

const testResourceTypeConfig1: ResourceTypeConfig = {
  id: "test-resource-type-id-1",
  name: "test resource type 1",
  description: "test resource type 1",
  createParams: [],
  infoParams: [],
  handlers: testResourceHandler,
  isCreatable: false,
  isUpdatable: false,
  isDeletable: false,
  ownerManagement: true,
  approverManagement: true,
};

const testResourceTypeConfig2: ResourceTypeConfig = {
  id: "test-resource-type-id-2",
  name: "test resource type 2",
  description: "test resource type 2",
  createParams: [],
  infoParams: [],
  handlers: testResourceHandler,
  isCreatable: false,
  isUpdatable: false,
  isDeletable: false,
  ownerManagement: true,
  approverManagement: true,
};

describe("listResourceOutlines", () => {
  // No resource has hub-side settings, so no visibility filtering happens.
  const catalogDBProvider: CatalogDBProvider = {
    getById: vi.fn().mockReturnValue(okAsync(some({ id: "test-catalog-id", ownerGroupId: undefined }))),
    listAll: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    set: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    delete: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
  };
  const resourceDBProvider: ResourceDBProvider = {
    getById: vi.fn(),
    set: vi.fn(),
    updatePendingUpdateParams: vi.fn(),
    delete: vi.fn(),
    createAuditNotification: vi.fn(),
    updateAuditNotification: vi.fn(),
    deleteAuditNotification: vi.fn(),
    listByResourceType: vi.fn().mockReturnValue(okAsync({ items: [] })),
  };
  const listGroupMemberShipByUser: GroupMemberShipProvider["listByUser"] = vi
    .fn()
    .mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error")));
  const baseProviders = { catalogDBProvider, resourceDBProvider, listGroupMemberShipByUser };

  const input: ListResourceOutlinesInput = {
    catalogId: "test-catalog-id",
    resourceTypeId: "test-resource-type-id",
    requestUserId: requestUserId,
  };

  it("Successful because ResourceTypeConfig exists in resourceTypes (data exists in listResources)", async () => {
    const catalogConfig: CatalogConfig = {
      id: "test-catalog-id",
      name: "test Catalog",
      description: "Contains target ResourceTypeConfig.",
      approvalFlows: [],
      resourceTypes: [testResourceTypeConfig, testResourceTypeConfig1, testResourceTypeConfig2],
    };
    const getCatalogConfigProvider: CatalogConfigProvider["get"] = () => {
      return okAsync(some(catalogConfig));
    };
    const catalogConfigProvider: CatalogConfigProvider = {
      get: getCatalogConfigProvider,
    };
    const result = await listResourceOutlines({ ...baseProviders, catalogConfigProvider })(input);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual({
      items: [
        {
          id: resourceId,
          name: resourceName,
          catalogId: "test-catalog-id",
          resourceTypeId: "test-resource-type-id",
          params: {},
          parentResourceId: parentResourceId,
        },
      ],
      paginationToken: paginationToken,
    });
  });

  it("Successful because ResourceTypeConfig exists in resourceTypes (data is empty in listResources)", async () => {
    const catalogConfig: CatalogConfig = {
      id: "test-catalog-id",
      name: "test Catalog",
      description: "Contains target ResourceTypeConfig.(listResources is empty)",
      approvalFlows: [],
      resourceTypes: [testEmptyResourceTypeConfig, testResourceTypeConfig1, testResourceTypeConfig2],
    };
    const getCatalogConfigProvider: CatalogConfigProvider["get"] = () => {
      return okAsync(some(catalogConfig));
    };
    const catalogConfigProvider: CatalogConfigProvider = {
      get: getCatalogConfigProvider,
    };
    const result = await listResourceOutlines({ ...baseProviders, catalogConfigProvider })(input);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual({
      items: [],
      paginationToken: undefined,
    });
  });

  it("Failure because ResourceTypeConfig does not exist in resourceTypes", async () => {
    const catalogConfig: CatalogConfig = {
      id: "test-catalog-id",
      name: "test Catalog",
      description: "List of ResourceTypeConfig does not exist.",
      approvalFlows: [],
      resourceTypes: [testResourceTypeConfig1, testResourceTypeConfig2],
    };
    const getCatalogConfigProvider: CatalogConfigProvider["get"] = () => {
      return okAsync(some(catalogConfig));
    };
    const catalogConfigProvider: CatalogConfigProvider = {
      get: getCatalogConfigProvider,
    };
    const result = await listResourceOutlines({ ...baseProviders, catalogConfigProvider })(input);
    expect(result.isErr()).toBe(true);
  });
  describe("visibility filtering", () => {
    const ownerGroupId = "96fc6a4c-b5d3-8c2b-0307-165168a023cd";
    const catalogOwnerGroupId = "0a3d8d5b-7a3f-4b2e-9c1d-2f4e6a8b0c1d";
    const catalogConfig: CatalogConfig = {
      id: "test-catalog-id",
      name: "test Catalog",
      description: "Contains target ResourceTypeConfig.",
      approvalFlows: [],
      resourceTypes: [testResourceTypeConfig],
    };
    const catalogConfigProvider: CatalogConfigProvider = { get: () => okAsync(some(catalogConfig)) };
    const restrictedRow = { id: resourceId, catalogId: "test-catalog-id", resourceTypeId: "test-resource-type-id", ownerGroupId, visibility: "restricted" as const };
    const providersWith = (memberOf: Array<string>, catalogOwner?: string) => ({
      catalogConfigProvider,
      catalogDBProvider: { ...catalogDBProvider, getById: vi.fn().mockReturnValue(okAsync(some({ id: "test-catalog-id", ownerGroupId: catalogOwner }))) },
      resourceDBProvider: { ...resourceDBProvider, listByResourceType: vi.fn().mockReturnValue(okAsync({ items: [restrictedRow] })) },
      listGroupMemberShipByUser: vi
        .fn()
        .mockReturnValue(okAsync({ items: memberOf.map((groupId) => ({ groupId, userId: requestUserId, role: "member", createdAt: "", updatedAt: "" })) })),
    });

    it("hides restricted resources from unrelated users but keeps paginationToken", async () => {
      const providers = providersWith([]);
      const result = await listResourceOutlines(providers)(input);
      expect(result._unsafeUnwrap()).toEqual({ items: [], paginationToken });
      expect(providers.resourceDBProvider.listByResourceType).toHaveBeenCalledTimes(1);
      expect(providers.listGroupMemberShipByUser).toHaveBeenCalledTimes(1);
    });

    it("shows restricted resources to owner group members", async () => {
      const result = await listResourceOutlines(providersWith([ownerGroupId]))(input);
      expect(result._unsafeUnwrap().items.map((item) => item.id)).toEqual([resourceId]);
    });

    it("shows restricted resources to the catalog owner", async () => {
      const result = await listResourceOutlines(providersWith([catalogOwnerGroupId], catalogOwnerGroupId))(input);
      expect(result._unsafeUnwrap().items.map((item) => item.id)).toEqual([resourceId]);
    });

    it("does not consult identity or the resource DB when the handler returns no resources", async () => {
      const emptyCatalogConfig: CatalogConfig = { ...catalogConfig, resourceTypes: [testEmptyResourceTypeConfig] };
      const providers = { ...providersWith([]), catalogConfigProvider: { get: () => okAsync(some(emptyCatalogConfig)) } };
      const result = await listResourceOutlines(providers)(input);
      expect(result._unsafeUnwrap()).toEqual({ items: [], paginationToken: undefined });
      expect(providers.resourceDBProvider.listByResourceType).not.toHaveBeenCalled();
      expect(providers.listGroupMemberShipByUser).not.toHaveBeenCalled();
    });
  });
});
