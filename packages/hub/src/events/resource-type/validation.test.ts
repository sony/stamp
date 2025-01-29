import { expect, it, describe, vi, beforeEach } from "vitest";
import { validateResourceTypeId } from "./validation";
import { err } from "neverthrow";
import { CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { ResourceHandlers, HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";

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

describe("validateResourceTypeId", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return ok if resource type exists", async () => {
    const testCatalogConfig: CatalogConfig = {
      id: "test-catalog",
      name: "test Catalog",
      description: "test Catalog",
      approvalFlows: [],
      resourceTypes: [testResourceTypeConfig1],
    };

    const input = { resourceTypeId: "test-resource-type-1", catalogConfig: testCatalogConfig };

    const result = await validateResourceTypeId(input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toStrictEqual(input);
  });

  it("should return ok and other input if resource type exists", async () => {
    const testCatalogConfig: CatalogConfig = {
      id: "test-catalog",
      name: "test Catalog",
      description: "test Catalog",
      approvalFlows: [],
      resourceTypes: [testResourceTypeConfig1],
    };

    const input = { resourceTypeId: "test-resource-type-1", catalogConfig: testCatalogConfig, otherInput: "test" };

    const result = await validateResourceTypeId(input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toStrictEqual(input);
  });

  it("should return ok if resource type exists and catalog has multi resource type", async () => {
    const testCatalogConfig: CatalogConfig = {
      id: "test-catalog",
      name: "test Catalog",
      description: "test Catalog",
      approvalFlows: [],
      resourceTypes: [testResourceTypeConfig1, testResourceTypeConfig2],
    };

    const input = { resourceTypeId: "test-resource-type-2", catalogConfig: testCatalogConfig };

    const result = await validateResourceTypeId(input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toStrictEqual(input);
  });

  it("should return error if resource type does not exist", async () => {
    const testCatalogConfig: CatalogConfig = {
      id: "test-catalog",
      name: "test Catalog",
      description: "test Catalog",
      approvalFlows: [],
      resourceTypes: [testResourceTypeConfig1, testResourceTypeConfig2],
    };
    const input = { resourceTypeId: "not-exist-resource", catalogConfig: testCatalogConfig };

    const result = await validateResourceTypeId(input);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});
