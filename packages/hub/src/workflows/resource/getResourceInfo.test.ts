import { none, some } from "@stamp-lib/stamp-option";
import { HandlerError, ResourceHandlers } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { CatalogConfig, ResourceOnDB, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { DBError, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { err, ok, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { getResourceInfo } from "./getResourceInfo";
import { GetResourceInfoInput } from "./input";

const requestUserId = "47f29c51-204c-09f6-2069-f3df073568c7"; // uuid is meaningless and was generated for testing.
const ownerGroupId = "96fc6a4c-b5d3-8c2b-0307-165168a023cd"; // uuid is meaningless and was generated for testing.

const testResourceHandler: ResourceHandlers = {
  createResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  deleteResource: async () => {
    return err(new HandlerError("not implemented1", "INTERNAL_SERVER_ERROR"));
  },
  getResource: async () => {
    return ok(some({ params: {}, resourceId: "112233445566", name: "test-resource", parentResourceId: "123456789012" }));
  },
  listResources: async () => {
    return err(new HandlerError("not implemented3", "INTERNAL_SERVER_ERROR"));
  },
  updateResource: async () => {
    return err(new HandlerError("not implemented4", "INTERNAL_SERVER_ERROR"));
  },
  listResourceAuditItem: async () => {
    return err(new HandlerError("not implemented5", "INTERNAL_SERVER_ERROR"));
  },
};

const baseResourceTypeConfig: ResourceTypeConfig = {
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

const resourceTypeConfigForSuccess: ResourceTypeConfig = {
  ...baseResourceTypeConfig,
  anyoneCanCreate: true,
  parentResourceTypeId: "test-parent-resource-type-id",
};

describe("getResourceInfo", () => {
  const resourceDBProviderForSuccess: ResourceDBProvider = {
    // Only ownerGroupId is checked in isParentResourceOwnerImpl
    getById: vi.fn().mockReturnValue(okAsync(some({ ownerGroupId: ownerGroupId }))),
    set: (resourceOnDB: ResourceOnDB) => {
      return okAsync(structuredClone(resourceOnDB));
    },
    delete: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
  };

  const input: GetResourceInfoInput = {
    catalogId: "test-catalog-id",
    resourceTypeId: "test-resource-type-id",
    resourceId: "112233445566",
    requestUserId: requestUserId,
  };

  const baseCatalogConfig: CatalogConfig = {
    id: "test-resource-type-id",
    name: "test-catalog-name",
    description: "test-description-approval-flows",
    approvalFlows: [],
    resourceTypes: [],
  };

  it("Successful because ResourceTypeConfig for the target resourceTypeId exist", async () => {
    // Set ResourceTypeConfig to success
    const catalogConfig: CatalogConfig = {
      ...baseCatalogConfig,
      resourceTypes: [resourceTypeConfigForSuccess],
    };
    const catalogConfigProvider: CatalogConfigProvider = {
      get: () => {
        return okAsync(some(catalogConfig));
      },
    };

    // All checks in checkCanEditResourceImpl are true
    const result = await getResourceInfo({
      getCatalogConfigProvider: catalogConfigProvider.get,
      getResourceDBProvider: resourceDBProviderForSuccess.getById,
    })(input);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual(
      some({
        params: {},
        resourceId: "112233445566",
        name: "test-resource",
        parentResourceId: "123456789012",
        ownerGroupId: ownerGroupId,
        id: "112233445566",
        catalogId: "test-catalog-id",
        resourceTypeId: "test-resource-type-id",
        parentResourceTypeId: "test-parent-resource-type-id",
      })
    );
  });

  it("Failure because resource deletion conditions were not met", async () => {
    const catalogConfigProvider: CatalogConfigProvider = {
      get: vi.fn().mockReturnValue(okAsync(none)),
    };

    // validateCatalogIdImpl is error
    const result = await getResourceInfo({
      getCatalogConfigProvider: catalogConfigProvider.get,
      getResourceDBProvider: resourceDBProviderForSuccess.getById,
    })(input);
    if (result.isOk()) {
      throw result.value;
    }
    expect(result.isErr()).toBe(true);
    expect(result.error.systemMessage).toBe("Catalog not found");
    expect(result.error.userMessage).toBe("Catalog Not Found");
    expect(result.error.code).toBe("NOT_FOUND");
  });

  it("Failure because ResourceTypeConfig for the target resourceTypeId does not exist", async () => {
    // Don't set ResourceTypeConfig
    const catalogConfig: CatalogConfig = {
      ...baseCatalogConfig,
      resourceTypes: [],
    };
    const catalogConfigProvider: CatalogConfigProvider = {
      get: () => {
        return okAsync(some(catalogConfig));
      },
    };

    // Don't set ResourceTypeConfig (validateResourceTypeId)
    const result = await getResourceInfo({
      getCatalogConfigProvider: catalogConfigProvider.get,
      getResourceDBProvider: resourceDBProviderForSuccess.getById,
    })(input);
    if (result.isOk()) {
      throw result.value;
    }
    expect(result.isErr()).toBe(true);
    expect(result.error.systemMessage).toBe("ResourceType not found");
    expect(result.error.userMessage).toBe("ResourceType Not Found");
    expect(result.error.code).toBe("NOT_FOUND");
  });
});
