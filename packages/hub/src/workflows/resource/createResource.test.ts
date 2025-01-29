import { some } from "@stamp-lib/stamp-option";
import { HandlerError, ResourceHandlers } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { CatalogConfig, ResourceOnDB, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, DBError, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GroupMemberShipProvider, IdentityPluginError } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { err, ok, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { createResource } from "./createResource";
import { CreateResourceInput } from "./input";

const requestUserId = "47f29c51-204c-09f6-2069-f3df073568c7"; // uuid is meaningless and was generated for testing.
const ownerGroupId = "96fc6a4c-b5d3-8c2b-0307-165168a023cd"; // uuid is meaningless and was generated for testing.
const approverGroupId = "1f10d463-a2fe-c407-2b95-05b561346c8b"; // uuid is meaningless and was generated for testing.

const testResourceHandler: ResourceHandlers = {
  createResource: async () => {
    return ok({ params: {}, resourceId: "112233445566", name: "test-resource", parentResourceId: "123456789012" });
  },
  deleteResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  getResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  listResources: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  updateResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  listResourceAuditItem: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
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

const resourceTypeConfigForFailure: ResourceTypeConfig = {
  ...baseResourceTypeConfig,
};

describe("createResource", () => {
  const catalogDbProviderForSuccess: CatalogDBProvider = {
    getById: () => {
      return okAsync(some({ id: "", ownerGroupId: ownerGroupId }));
    },
    listAll: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    set: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    delete: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
  };

  const catalogDbProviderForFailure: CatalogDBProvider = {
    getById: () => {
      return okAsync(some({ id: "", ownerGroupId: "" }));
    },
    listAll: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    set: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
    delete: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
  };

  const resourceDBProviderForSuccess: ResourceDBProvider = {
    // Only ownerGroupId is checked in isParentResourceOwnerImpl
    getById: vi.fn().mockReturnValue(okAsync(some({ ownerGroupId: ownerGroupId }))),
    set: (resourceOnDB: ResourceOnDB) => {
      return okAsync(structuredClone(resourceOnDB));
    },
    delete: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
  };

  const resourceDBProviderForFailure: ResourceDBProvider = {
    getById: vi.fn().mockReturnValue(okAsync(some({}))),
    set: (resourceOnDB: ResourceOnDB) => {
      return okAsync(structuredClone(resourceOnDB));
    },
    delete: vi.fn().mockResolvedValue(err(new DBError("DB error"))),
  };

  const groupMemberShipProvider: GroupMemberShipProvider = {
    get: vi.fn().mockReturnValue(okAsync(some({}))),
    listByGroup: vi.fn().mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error"))),
    listByUser: vi.fn().mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error"))),
    create: vi.fn().mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error"))),
    delete: vi.fn().mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error"))),
    update: vi.fn().mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error"))),
    count: vi.fn().mockReturnValue(err(new IdentityPluginError("This is Identity Plugin Error"))),
  };

  const baseInput: CreateResourceInput = {
    catalogId: "test-catalog-id",
    resourceTypeId: "test-resource-type-id",
    inputParams: {},
    requestUserId: requestUserId,
  };

  const baseCatalogConfig: CatalogConfig = {
    id: "test-resource-type-id",
    name: "test-catalog-name",
    description: "test-description-approval-flows",
    approvalFlows: [],
    resourceTypes: [],
  };

  it("Successful because ResourceTypeConfig for the target resourceTypeId exist (Do not add record to resource DB)", async () => {
    const input: CreateResourceInput = {
      ...baseInput,
      parentResourceId: "123456789012",
    };

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
    // All checks in checkCanCreateResourceImpl are true
    const result = await createResource({
      catalogDBProvider: catalogDbProviderForSuccess,
      catalogConfigProvider: catalogConfigProvider,
      resourceDBProvider: resourceDBProviderForSuccess,
      getGroupMemberShip: groupMemberShipProvider.get,
    })(input);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual({
      catalogId: "test-catalog-id",
      resourceTypeId: "test-resource-type-id",
      inputParams: {},
      requestUserId: requestUserId,
      id: "112233445566",
      params: {},
      resourceId: "112233445566",
      name: "test-resource",
      parentResourceId: "123456789012",
    });
  });

  it("Successful because ResourceTypeConfig for the target resourceTypeId exist (Add record to resource DB because approverGroupId exist)", async () => {
    const input: CreateResourceInput = {
      ...baseInput,
      parentResourceId: "123456789012",
      approverGroupId: approverGroupId,
    };

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

    // All checks in checkCanCreateResourceImpl are true
    const result = await createResource({
      catalogDBProvider: catalogDbProviderForSuccess,
      catalogConfigProvider: catalogConfigProvider,
      resourceDBProvider: resourceDBProviderForSuccess,
      getGroupMemberShip: groupMemberShipProvider.get,
    })(input);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual({
      catalogId: "test-catalog-id",
      resourceTypeId: "test-resource-type-id",
      inputParams: {},
      approverGroupId: approverGroupId,
      requestUserId: requestUserId,
      id: "112233445566",
      params: {},
      resourceId: "112233445566",
      name: "test-resource",
      parentResourceId: "123456789012",
    });
  });

  it("Successful because ResourceTypeConfig for the target resourceTypeId exist (Add record to resource DB because ownerGroupId exist)", async () => {
    const input: CreateResourceInput = {
      ...baseInput,
      parentResourceId: "123456789012",
      ownerGroupId: ownerGroupId,
    };

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

    // All checks in checkCanCreateResourceImpl are true
    const result = await createResource({
      catalogDBProvider: catalogDbProviderForSuccess,
      catalogConfigProvider: catalogConfigProvider,
      resourceDBProvider: resourceDBProviderForSuccess,
      getGroupMemberShip: groupMemberShipProvider.get,
    })(input);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual({
      catalogId: "test-catalog-id",
      resourceTypeId: "test-resource-type-id",
      inputParams: {},
      ownerGroupId: ownerGroupId,
      requestUserId: requestUserId,
      id: "112233445566",
      params: {},
      resourceId: "112233445566",
      name: "test-resource",
      parentResourceId: "123456789012",
    });
  });

  it("Failure because resource generation conditions were not met", async () => {
    const input: CreateResourceInput = {
      ...baseInput,
      parentResourceId: undefined,
    };

    // Set ResourceTypeConfig to failure
    const catalogConfig: CatalogConfig = {
      ...baseCatalogConfig,
      resourceTypes: [resourceTypeConfigForFailure],
    };
    const catalogConfigProvider: CatalogConfigProvider = {
      get: () => {
        return okAsync(some(catalogConfig));
      },
    };

    // All checks in checkCanCreateResourceImpl are false
    const result = await createResource({
      catalogDBProvider: catalogDbProviderForFailure,
      catalogConfigProvider: catalogConfigProvider,
      resourceDBProvider: resourceDBProviderForFailure,
      getGroupMemberShip: groupMemberShipProvider.get,
    })(input);
    if (result.isOk()) {
      throw result.value;
    }
    expect(result.isErr()).toBe(true);
    expect(result.error.systemMessage).toBe("Permission denied");
    expect(result.error.userMessage).toBe("Permission Denied");
    expect(result.error.code).toBe("FORBIDDEN");
  });

  it("Failure because ResourceTypeConfig for the target resourceTypeId does not exist", async () => {
    const input: CreateResourceInput = {
      ...baseInput,
      parentResourceId: "123456789012",
    };

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

    // All checks in checkCanCreateResourceImpl are true
    const result = await createResource({
      catalogDBProvider: catalogDbProviderForSuccess,
      catalogConfigProvider: catalogConfigProvider,
      resourceDBProvider: resourceDBProviderForSuccess,
      getGroupMemberShip: groupMemberShipProvider.get,
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
