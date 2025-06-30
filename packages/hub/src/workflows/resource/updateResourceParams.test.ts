import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateResourceParams } from "./updateResourceParams";
import { okAsync, errAsync, ok } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";
import { StampHubError } from "../../error";

describe("updateResourceParams", () => {
  const mockCatalogConfigProvider = { get: vi.fn() };
  const mockCheckCanEditResource = vi.fn();

  const validInput = {
    catalogId: "cat-1",
    resourceTypeId: "type-1",
    resourceId: "11111111-1111-1111-1111-111111111111",
    updateParams: { foo: "bar" },
    requestUserId: "11111111-1111-1111-1111-111111111111",
  };

  const mockResourceTypeConfig = {
    id: "type-1",
    name: "Test Resource Type",
    description: "Test resource type description",
    createParams: [],
    infoParams: [],
    isCreatable: true,
    isUpdatable: true,
    isDeletable: true,
    ownerManagement: false,
    approverManagement: false,
    updateApprover: { approverType: "this" },
    handlers: {
      updateResource: vi.fn(),
    },
  };

  const mockCatalogConfig = {
    id: "cat-1",
    name: "Test Catalog",
    description: "Test catalog description",
    approvalFlows: [],
    resourceTypes: [mockResourceTypeConfig],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully update resource params when resource type is updatable by this user", async () => {
    // Mock the getCatalogConfig call (first step)
    mockCatalogConfigProvider.get.mockReturnValue(okAsync(some(mockCatalogConfig)));

    // Mock the checkCanEditResource call (second step)
    const extendedWithCatalogConfig = {
      ...validInput,
      catalogConfig: mockCatalogConfig,
    };
    mockCheckCanEditResource.mockReturnValue(okAsync(extendedWithCatalogConfig));

    // Mock the updateResource handler call (final step)
    mockResourceTypeConfig.handlers.updateResource.mockResolvedValue(
      ok({
        resourceId: "11111111-1111-1111-1111-111111111111",
        name: "updated-resource",
        params: { foo: "updated-bar" },
      })
    );

    const result = await updateResourceParams({
      catalogConfigProvider: mockCatalogConfigProvider,
      checkCanEditResource: mockCheckCanEditResource,
    })(validInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ foo: "updated-bar" });
    }
  });

  it("should return error if input validation fails", async () => {
    const invalidInput = { ...validInput, catalogId: "" };

    const result = await updateResourceParams({
      catalogConfigProvider: mockCatalogConfigProvider,
      checkCanEditResource: mockCheckCanEditResource,
    })(invalidInput);

    expect(result.isErr()).toBe(true);
  });

  it("should return error if user cannot edit resource", async () => {
    mockCatalogConfigProvider.get.mockReturnValue(okAsync(some(mockCatalogConfig)));
    mockCheckCanEditResource.mockReturnValue(errAsync(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN")));

    const result = await updateResourceParams({
      catalogConfigProvider: mockCatalogConfigProvider,
      checkCanEditResource: mockCheckCanEditResource,
    })(validInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should return error if resource type is not updatable", async () => {
    const nonUpdatableConfig = {
      ...mockCatalogConfig,
      resourceTypes: [{ ...mockResourceTypeConfig, isUpdatable: false }],
    };
    mockCatalogConfigProvider.get.mockReturnValue(okAsync(some(nonUpdatableConfig)));

    const extendedWithCatalogConfig = {
      ...validInput,
      catalogConfig: nonUpdatableConfig,
    };
    mockCheckCanEditResource.mockReturnValue(okAsync(extendedWithCatalogConfig));

    const result = await updateResourceParams({
      catalogConfigProvider: mockCatalogConfigProvider,
      checkCanEditResource: mockCheckCanEditResource,
    })(validInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.userMessage).toBe("ResourceType Not Updatable");
    }
  });

  it("should return error if resource type is not updatable by this user", async () => {
    const parentUpdatableConfig = {
      ...mockCatalogConfig,
      resourceTypes: [
        {
          ...mockResourceTypeConfig,
          isUpdatable: true,
          updateApprover: { approverType: "parentResource" },
        },
      ],
    };
    mockCatalogConfigProvider.get.mockReturnValue(okAsync(some(parentUpdatableConfig)));

    const extendedWithCatalogConfig = {
      ...validInput,
      catalogConfig: parentUpdatableConfig,
    };
    mockCheckCanEditResource.mockReturnValue(okAsync(extendedWithCatalogConfig));

    const result = await updateResourceParams({
      catalogConfigProvider: mockCatalogConfigProvider,
      checkCanEditResource: mockCheckCanEditResource,
    })(validInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.userMessage).toBe("ResourceType Not Updatable");
    }
  });

  it("should return error if catalog config not found", async () => {
    mockCatalogConfigProvider.get.mockReturnValue(okAsync(none));

    const result = await updateResourceParams({
      catalogConfigProvider: mockCatalogConfigProvider,
      checkCanEditResource: mockCheckCanEditResource,
    })(validInput);

    expect(result.isErr()).toBe(true);
  });

  it("should return error if resource update handler fails", async () => {
    mockCatalogConfigProvider.get.mockReturnValue(okAsync(some(mockCatalogConfig)));
    mockCheckCanEditResource.mockReturnValue(okAsync(validInput));
    mockResourceTypeConfig.handlers.updateResource.mockResolvedValue(errAsync(new Error("Handler failed")));

    const result = await updateResourceParams({
      catalogConfigProvider: mockCatalogConfigProvider,
      checkCanEditResource: mockCheckCanEditResource,
    })(validInput);

    expect(result.isErr()).toBe(true);
  });
});
