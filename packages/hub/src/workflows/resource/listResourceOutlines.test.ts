import { some } from "@stamp-lib/stamp-option";
import { HandlerError, ResourceHandlers } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
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
    const result = await listResourceOutlines({ catalogConfigProvider })(input);
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
    const result = await listResourceOutlines({ catalogConfigProvider })(input);
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
    const result = await listResourceOutlines({ catalogConfigProvider })(input);
    expect(result.isErr()).toBe(true);
  });
});
