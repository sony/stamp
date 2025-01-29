import { expect, it, describe, vi, beforeEach } from "vitest";
import { getResourceTypeConfig, GetResourceTypeConfigInput } from "./resourceTypeConfig";
import { CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { ResourceHandlers, HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { err } from "neverthrow";

const testResourceTypeHandler: ResourceHandlers = {
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

const testResourceTypeConfig1: ResourceTypeConfig = {
  id: "test-resource-type-1",
  name: "test resource type 1",
  description: "test resource type 1",
  createParams: [],
  infoParams: [],
  handlers: testResourceTypeHandler,
  isCreatable: false,
  isUpdatable: false,
  isDeletable: false,
  ownerManagement: true,
  approverManagement: true,
};

const testResourceTypeConfig2: ResourceTypeConfig = {
  id: "test-resource-type-2",
  name: "test resource type 2",
  description: "test resource type 2",
  createParams: [],
  infoParams: [],
  handlers: testResourceTypeHandler,
  isCreatable: false,
  isUpdatable: false,
  isDeletable: false,
  ownerManagement: true,
  approverManagement: true,
};

describe("getResourceTypeConfig", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return resourceTypeConfig if resource type exists", async () => {
    const testCatalogConfig: CatalogConfig = {
      id: "test-catalog",
      name: "test Catalog",
      description: "test Catalog",
      approvalFlows: [],
      resourceTypes: [testResourceTypeConfig1],
    };

    const input: GetResourceTypeConfigInput = {
      catalogConfig: testCatalogConfig,
      resourceTypeId: "test-resource-type-1",
    };

    const result = await getResourceTypeConfig(input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.resourceTypeConfig).toStrictEqual(testResourceTypeConfig1);
  });

  it("should return resourceTypeConfig if resource type exists and catalogConfig has multi resourceTypes", async () => {
    const testCatalogConfig: CatalogConfig = {
      id: "test-catalog",
      name: "test Catalog",
      description: "test Catalog",
      approvalFlows: [],
      resourceTypes: [testResourceTypeConfig1, testResourceTypeConfig2],
    };

    const input: GetResourceTypeConfigInput = {
      catalogConfig: testCatalogConfig,
      resourceTypeId: "test-resource-type-2",
    };

    const result = await getResourceTypeConfig(input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.resourceTypeConfig).toStrictEqual(testResourceTypeConfig2);
  });

  it("should return resourceTypeConfig and other input param if resource type exists and catalogConfig", async () => {
    const testCatalogConfig: CatalogConfig = {
      id: "test-catalog",
      name: "test Catalog",
      description: "test Catalog",
      approvalFlows: [],
      resourceTypes: [testResourceTypeConfig1, testResourceTypeConfig2],
    };

    const input = {
      catalogConfig: testCatalogConfig,
      resourceTypeId: "test-resource-type-2",
      otherParam: "test",
    };

    const result = await getResourceTypeConfig(input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toStrictEqual({ ...input, resourceTypeConfig: testResourceTypeConfig2 });
  });

  it("should return an error if resource type does not exist", async () => {
    const testCatalogConfig: CatalogConfig = {
      id: "test-catalog",
      name: "test Catalog",
      description: "test Catalog",
      approvalFlows: [],
      resourceTypes: [testResourceTypeConfig1, testResourceTypeConfig2],
    };

    const input: GetResourceTypeConfigInput = {
      catalogConfig: testCatalogConfig,
      resourceTypeId: "not-exist-resource-type",
    };
    const result = await getResourceTypeConfig(input);

    expect(result.isOk()).toBe(false);
    if (result.isOk()) {
      throw new Error("test failed");
    }
    expect(result.error.code).toBe("NOT_FOUND");
  });
});
