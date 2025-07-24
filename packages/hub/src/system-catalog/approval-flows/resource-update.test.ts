import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateResourceUpdateRequest, executeResourceUpdateApproval, checkCanApproveResourceUpdate } from "./resource-update";
import { okAsync, ok, errAsync } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";

describe("validateResourceUpdateRequest", () => {
  const mockGetCatalogConfig = vi.fn();
  const mockCheckCanApproveResourceUpdate = vi.fn();

  const mockDeps = {
    getCatalogConfig: mockGetCatalogConfig,
    checkCanApproveResourceUpdate: mockCheckCanApproveResourceUpdate,
  };

  const validInput = {
    inputParams: {
      catalogId: { id: "catalogId", value: "cat-1" },
      resourceTypeId: { id: "resourceTypeId", value: "type-1" },
      resourceId: { id: "resourceId", value: "res-1" },
      updateParams: { id: "updateParams", value: JSON.stringify({ foo: "bar" }) },
    },
    requestUserId: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
    approverId: "group-1",
    inputResources: {},
    requestId: "req-1",
    approvalFlowId: "flow-1",
    requestDate: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error if input parameters are invalid", async () => {
    const invalidInput = { ...validInput, inputParams: {} };

    const result = await validateResourceUpdateRequest(mockDeps)(invalidInput);

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(HandlerError);
    expect(error.message).toContain("Invalid input parameters");
  });

  it("should return success when validation passes", async () => {
    const mockResourceTypeConfig = {
      id: "type-1",
      name: "Test Resource Type",
      description: "Test resource type description",
      createParams: [],
      infoParams: [],
      handlers: {
        getResource: vi.fn().mockResolvedValue(ok(some({ id: "res-1" }))),
        createResource: vi.fn(),
        updateResource: vi.fn(),
        deleteResource: vi.fn(),
      },
      isCreatable: true,
      isUpdatable: true,
      isDeletable: true,
      ownerManagement: true,
      approverManagement: true,
      anyoneCanCreate: false,
      parentResourceTypeId: "parent-type",
    };

    const mockCatalogConfig = {
      id: "cat-1",
      name: "Test Catalog",
      description: "Test catalog description",
      approvalFlows: [],
      resourceTypes: [mockResourceTypeConfig],
    };

    mockCheckCanApproveResourceUpdate.mockReturnValue(okAsync(validInput));
    mockGetCatalogConfig.mockReturnValue(okAsync({ catalogConfig: mockCatalogConfig, resourceTypeId: "type-1" }));

    const result = await validateResourceUpdateRequest(mockDeps)(validInput);

    expect(result.isOk()).toBe(true);
    const value = result._unsafeUnwrap();
    expect(value.isSuccess).toBe(true);
    expect(value.message).toContain("This is resource update request");
  });

  it("should return error when checkCanApproveResourceUpdate fails", async () => {
    mockCheckCanApproveResourceUpdate.mockReturnValue(errAsync(new HandlerError("Access denied", "BAD_REQUEST")));

    const result = await validateResourceUpdateRequest(mockDeps)(validInput);

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(HandlerError);
    expect(error.message).toContain("Access denied");
  });
});

describe("executeResourceUpdateApproval", () => {
  const mockGetCatalogConfig = vi.fn();
  const mockCheckCanApproveResourceUpdate = vi.fn();
  const mockUpdatePendingUpdateParams = vi.fn();

  const mockDeps = {
    getCatalogConfig: mockGetCatalogConfig,
    checkCanApproveResourceUpdate: mockCheckCanApproveResourceUpdate,
    updatePendingUpdateParams: mockUpdatePendingUpdateParams,
  };

  const validInput = {
    inputParams: {
      catalogId: { id: "catalogId", value: "cat-1" },
      resourceTypeId: { id: "resourceTypeId", value: "type-1" },
      resourceId: { id: "resourceId", value: "res-1" },
      updateParams: { id: "updateParams", value: JSON.stringify({ foo: "bar" }) },
    },
    requestUserId: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
    approverId: "group-1",
    inputResources: {},
    requestId: "req-1",
    approvalFlowId: "flow-1",
    requestDate: new Date().toISOString(),
    approvedDate: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error if input parameters are invalid", async () => {
    const invalidInput = { ...validInput, inputParams: {} };

    const result = await executeResourceUpdateApproval(mockDeps)(invalidInput);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(HandlerError);
    expect(result._unsafeUnwrapErr().message).toContain("Invalid input parameters");
  });

  it("should handle HandlerError from updateResource handler when executing approval", async () => {
    // Mock all dependencies to reach the updateResource handler
    const mockUpdateResource = vi.fn().mockRejectedValue(new HandlerError("Resource validation failed", "BAD_REQUEST"));

    const mockResourceTypeConfig = {
      id: "type-1",
      name: "Test Resource Type",
      description: "Test resource type description",
      createParams: [],
      infoParams: [],
      handlers: {
        updateResource: mockUpdateResource,
        getResource: vi.fn().mockResolvedValue(ok(some({}))),
        createResource: vi.fn(),
        deleteResource: vi.fn(),
      },
      isCreatable: true,
      isUpdatable: true,
      isDeletable: true,
      ownerManagement: true,
      approverManagement: true,
      anyoneCanCreate: false,
      parentResourceTypeId: "parent-type",
    };

    const mockCatalogConfig = {
      id: "cat-1",
      name: "Test Catalog",
      description: "Test catalog description",
      approvalFlows: [],
      resourceTypes: [mockResourceTypeConfig],
    };

    // Mock all dependencies
    mockCheckCanApproveResourceUpdate.mockReturnValue(okAsync(validInput));
    mockGetCatalogConfig.mockReturnValue(okAsync({ catalogConfig: mockCatalogConfig, resourceTypeId: "type-1" }));

    const result = await executeResourceUpdateApproval(mockDeps)(validInput);

    expect(result.isOk()).toBe(true);
    const value = result._unsafeUnwrap();
    expect(value.isSuccess).toBe(false);
    // HandlerError gets converted to StampHubError by convertPromiseResultToResultAsync,
    // so it's handled as a generic error rather than a HandlerError
    expect(value.message).toContain("Failed to execute resource update approval");
  });

  it("should handle generic Error from updateResource handler when executing approval", async () => {
    vi.clearAllMocks();

    // Mock all dependencies to reach the updateResource handler
    const mockUpdateResource = vi.fn().mockRejectedValue(new Error("Network timeout during resource update"));

    const mockResourceTypeConfig = {
      id: "type-1",
      name: "Test Resource Type",
      description: "Test resource type description",
      createParams: [],
      infoParams: [],
      handlers: {
        updateResource: mockUpdateResource,
        getResource: vi.fn().mockResolvedValue(ok(some({}))),
        createResource: vi.fn(),
        deleteResource: vi.fn(),
      },
      isCreatable: true,
      isUpdatable: true,
      isDeletable: true,
      ownerManagement: true,
      approverManagement: true,
      anyoneCanCreate: false,
      parentResourceTypeId: "parent-type",
    };

    const mockCatalogConfig = {
      id: "cat-1",
      name: "Test Catalog",
      description: "Test catalog description",
      approvalFlows: [],
      resourceTypes: [mockResourceTypeConfig],
    };

    // Mock all dependencies
    mockCheckCanApproveResourceUpdate.mockReturnValue(okAsync(validInput));
    mockGetCatalogConfig.mockReturnValue(okAsync({ catalogConfig: mockCatalogConfig, resourceTypeId: "type-1" }));

    const result = await executeResourceUpdateApproval(mockDeps)(validInput);

    expect(result.isOk()).toBe(true);
    const value = result._unsafeUnwrap();
    expect(value.isSuccess).toBe(false);
    expect(value.message).toContain("Failed to execute resource update approval");
  });

  it("should execute successfully when all operations succeed", async () => {
    const mockUpdateResource = vi.fn().mockResolvedValue(ok({ updated: true }));

    const mockResourceTypeConfig = {
      id: "type-1",
      name: "Test Resource Type",
      description: "Test resource type description",
      createParams: [],
      infoParams: [],
      handlers: {
        updateResource: mockUpdateResource,
        getResource: vi.fn().mockResolvedValue(ok(some({}))),
        createResource: vi.fn(),
        deleteResource: vi.fn(),
      },
      isCreatable: true,
      isUpdatable: true,
      isDeletable: true,
      ownerManagement: true,
      approverManagement: true,
      anyoneCanCreate: false,
      parentResourceTypeId: "parent-type",
    };

    const mockCatalogConfig = {
      id: "cat-1",
      name: "Test Catalog",
      description: "Test catalog description",
      approvalFlows: [],
      resourceTypes: [mockResourceTypeConfig],
    };

    // Mock all dependencies
    mockCheckCanApproveResourceUpdate.mockReturnValue(okAsync(validInput));
    mockGetCatalogConfig.mockReturnValue(okAsync({ catalogConfig: mockCatalogConfig, resourceTypeId: "type-1" }));
    mockUpdatePendingUpdateParams.mockReturnValue(okAsync({}));

    const result = await executeResourceUpdateApproval(mockDeps)(validInput);

    expect(result.isOk()).toBe(true);
    const value = result._unsafeUnwrap();
    expect(value.isSuccess).toBe(true);
    expect(value.message).toContain("Resource update executed successfully");
    expect(mockUpdatePendingUpdateParams).toHaveBeenCalledWith({
      catalogId: "cat-1",
      resourceTypeId: "type-1",
      id: "res-1",
      pendingUpdateParams: undefined,
    });
  });
});

describe("checkCanApproveResourceUpdate", () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  };

  const validInput = {
    catalogId: "cat-1",
    resourceTypeId: "type-1",
    resourceId: "res-1",
    requestUserId: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
    approverGroupId: "group-1",
  };

  it("should return error if resource not found", async () => {
    const mockGetResourceInfo = vi.fn().mockReturnValue(okAsync(none));

    const result = await checkCanApproveResourceUpdate({
      getResourceInfo: mockGetResourceInfo,
      logger: mockLogger,
    })(validInput);

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(HandlerError);
    expect(error.message).toBe("Parent Resource not found");
  });

  it("should return error if parent resource not found", async () => {
    const mockGetResourceInfo = vi
      .fn()
      .mockReturnValueOnce(
        okAsync(
          some({
            resourceId: "res-1",
            parentResourceTypeId: "parent-type",
            parentResourceId: "parent-res",
          })
        )
      )
      .mockReturnValueOnce(okAsync(none));

    const result = await checkCanApproveResourceUpdate({
      getResourceInfo: mockGetResourceInfo,
      logger: mockLogger,
    })(validInput);

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(HandlerError);
    expect(error.message).toBe("Resource not found");
  });

  it("should return error if parent resource has no approver group", async () => {
    const mockGetResourceInfo = vi
      .fn()
      .mockReturnValueOnce(
        okAsync(
          some({
            resourceId: "res-1",
            parentResourceTypeId: "parent-type",
            parentResourceId: "parent-res",
          })
        )
      )
      .mockReturnValueOnce(
        okAsync(
          some({
            resourceId: "parent-res",
            approverGroupId: undefined,
          })
        )
      );

    const result = await checkCanApproveResourceUpdate({
      getResourceInfo: mockGetResourceInfo,
      logger: mockLogger,
    })(validInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Parent resource does not have an approver group");
  });

  it("should return error if approver group does not match", async () => {
    const mockGetResourceInfo = vi
      .fn()
      .mockReturnValueOnce(
        okAsync(
          some({
            resourceId: "res-1",
            parentResourceTypeId: "parent-type",
            parentResourceId: "parent-res",
          })
        )
      )
      .mockReturnValueOnce(
        okAsync(
          some({
            resourceId: "parent-res",
            approverGroupId: "different-group",
          })
        )
      );

    const result = await checkCanApproveResourceUpdate({
      getResourceInfo: mockGetResourceInfo,
      logger: mockLogger,
    })(validInput);

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error.message).toBe("Approver group does not match parent resource's approver group");
  });

  it("should return success if all validations pass", async () => {
    const mockGetResourceInfo = vi
      .fn()
      .mockReturnValueOnce(
        okAsync(
          some({
            resourceId: "res-1",
            parentResourceTypeId: "parent-type",
            parentResourceId: "parent-res",
          })
        )
      )
      .mockReturnValueOnce(
        okAsync(
          some({
            resourceId: "parent-res",
            approverGroupId: "group-1",
          })
        )
      );

    const result = await checkCanApproveResourceUpdate({
      getResourceInfo: mockGetResourceInfo,
      logger: mockLogger,
    })(validInput);

    expect(result.isOk()).toBe(true);
    const value = result._unsafeUnwrap();
    expect(value).toEqual(validInput);
  });
});
