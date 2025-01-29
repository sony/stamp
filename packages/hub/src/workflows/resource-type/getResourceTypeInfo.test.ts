import { some } from "@stamp-lib/stamp-option";
import { HandlerError, ResourceHandlers } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { err, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import { getResourceTypeInfo } from "./getResourceTypeInfo";
import { GetResourceTypeInfoInput } from "./input";

const requestUserId = "47f29c51-204c-09f6-2069-f3df073568c7"; // The uuid is meaningless and was generated for testing.

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
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
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

describe("getResourceTypeInfo", () => {
  const input: GetResourceTypeInfoInput = {
    catalogId: "test-catalog-id",
    resourceTypeId: "test-resource-type-id",
    requestUserId: requestUserId,
  };

  it("Successful because ResourceTypeConfig for the target resourceTypeId exist", async () => {
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
    const result = await getResourceTypeInfo(input, catalogConfigProvider);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.isOk()).toBe(true);
    expect(result.value.catalogId).toStrictEqual("test-catalog-id");
    expect(result.value.id).toStrictEqual("test-resource-type-id");
  });

  it("Failure because ResourceTypeConfig for the target resourceTypeId does not exist", async () => {
    const catalogConfig: CatalogConfig = {
      id: "test-catalog-id",
      name: "test Catalog",
      description: "Target ResourceTypeConfig is not included.",
      approvalFlows: [],
      resourceTypes: [testResourceTypeConfig1, testResourceTypeConfig2],
    };
    const getCatalogConfigProvider: CatalogConfigProvider["get"] = () => {
      return okAsync(some(catalogConfig));
    };
    const catalogConfigProvider: CatalogConfigProvider = {
      get: getCatalogConfigProvider,
    };
    const result = await getResourceTypeInfo(input, catalogConfigProvider);
    expect(result.isErr()).toBe(true);
  });
});
