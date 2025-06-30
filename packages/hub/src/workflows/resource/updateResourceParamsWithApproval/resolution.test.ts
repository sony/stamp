import { describe, it, expect, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";
import { createResolveResourceWithFallback, createResolveApproverGroup, createResolveSystemCatalog, resolveApprovalFlow } from "./resolution";
import { ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { createLogger } from "@stamp-lib/stamp-logger";

const logger = createLogger("DEBUG", { moduleName: "test" });

describe("updateResourceParamsWithApproval.resolution", () => {
  const validInput = {
    catalogId: "cat-1",
    resourceTypeId: "type-1",
    resourceId: "res-1",
    updateParams: { foo: "bar" },
    requestUserId: "user-1",
  };

  describe("createResolveResourceWithFallback", () => {
    it("should return existing resource when found", async () => {
      const mockResourceDBProvider: ResourceDBProvider = {
        getById: vi.fn().mockReturnValue(okAsync(some({ id: "res-1" }))),
        set: vi.fn(),
        updatePendingUpdateParams: vi.fn(),
        delete: vi.fn(),
        createAuditNotification: vi.fn(),
        updateAuditNotification: vi.fn(),
        deleteAuditNotification: vi.fn(),
      };
      const mockGetResourceInfo = vi.fn().mockReturnValue(okAsync(some({ id: "res-1", name: "Test Resource" })));

      const resolver = createResolveResourceWithFallback(mockResourceDBProvider.getById, mockResourceDBProvider.set, mockGetResourceInfo, logger);
      const result = await resolver(validInput);

      expect(result.isOk()).toBe(true);
      expect(mockResourceDBProvider.set).not.toHaveBeenCalled();
    });

    it("should create new resource when DB resource not found but resource info exists", async () => {
      const mockResourceDBProvider = {
        getById: vi.fn().mockReturnValue(okAsync(none)),
        set: vi.fn().mockReturnValue(okAsync(undefined)),
      };
      const mockGetResourceInfo = vi.fn().mockReturnValue(okAsync(some({ id: "res-1", name: "Test Resource" })));

      const resolver = createResolveResourceWithFallback(mockResourceDBProvider.getById, mockResourceDBProvider.set, mockGetResourceInfo, logger);
      const result = await resolver(validInput);

      expect(result.isOk()).toBe(true);
      expect(mockResourceDBProvider.set).toHaveBeenCalledWith({
        id: "res-1",
        catalogId: "cat-1",
        resourceTypeId: "type-1",
      });
    });

    it("should return error when resource info not found", async () => {
      const mockResourceDBProvider = {
        getById: vi.fn().mockReturnValue(okAsync(some({ id: "res-1" }))),
        set: vi.fn(),
      };
      const mockGetResourceInfo = vi.fn().mockReturnValue(okAsync(none));

      const resolver = createResolveResourceWithFallback(mockResourceDBProvider.getById, mockResourceDBProvider.set, mockGetResourceInfo, logger);
      const result = await resolver(validInput);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Resource Not Found");
      }
    });

    it("should handle database errors gracefully", async () => {
      const mockResourceDBProvider = {
        getById: vi.fn().mockReturnValue(errAsync(new Error("DB Error"))),
        set: vi.fn(),
      };
      const mockGetResourceInfo = vi.fn().mockReturnValue(okAsync(some({ id: "res-1" })));

      const resolver = createResolveResourceWithFallback(mockResourceDBProvider.getById, mockResourceDBProvider.set, mockGetResourceInfo, logger);
      const result = await resolver(validInput);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
      }
    });
  });

  describe("createResolveApproverGroup", () => {
    it("should resolve parent resource approver successfully", async () => {
      const mockGetResourceInfo = vi.fn().mockReturnValue(okAsync(some({ approverGroupId: "group-1" })));

      const resolver = createResolveApproverGroup(mockGetResourceInfo);

      const resourceTypeInfo = {
        isUpdatable: true,
        updateApprover: { approverType: "parentResource" },
        parentResourceTypeId: "parent-type",
      };

      const resource = {
        pendingUpdateParams: null,
        parentResourceId: "parent-res",
      };

      const result = await resolver(resourceTypeInfo, resource, validInput);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("group-1");
      }
    });

    it("should return error when resource has pending updates", async () => {
      const mockGetResourceInfo = vi.fn();
      const resolver = createResolveApproverGroup(mockGetResourceInfo);

      const resourceTypeInfo = { isUpdatable: true };
      const resource = {
        pendingUpdateParams: { approvalRequestId: "req-1", updateParams: {} },
      };

      const result = await resolver(resourceTypeInfo, resource, validInput);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Resource Pending Update");
      }
    });

    it("should return error when resource type is not updatable", async () => {
      const mockGetResourceInfo = vi.fn();
      const resolver = createResolveApproverGroup(mockGetResourceInfo);

      const resourceTypeInfo = { isUpdatable: false };
      const resource = { pendingUpdateParams: null };

      const result = await resolver(resourceTypeInfo, resource, validInput);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Resource Type Not Updatable");
      }
    });

    it("should return error when approver type is 'this'", async () => {
      const mockGetResourceInfo = vi.fn();
      const resolver = createResolveApproverGroup(mockGetResourceInfo);

      const resourceTypeInfo = {
        isUpdatable: true,
        updateApprover: { approverType: "this" },
      };
      const resource = { pendingUpdateParams: null };

      const result = await resolver(resourceTypeInfo, resource, validInput);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Approver type is 'this'");
      }
    });

    it("should return error when parent resource not found", async () => {
      const mockGetResourceInfo = vi.fn().mockReturnValue(okAsync(none));
      const resolver = createResolveApproverGroup(mockGetResourceInfo);

      const resourceTypeInfo = {
        isUpdatable: true,
        updateApprover: { approverType: "parentResource" },
        parentResourceTypeId: "parent-type",
      };
      const resource = {
        pendingUpdateParams: null,
        parentResourceId: "parent-res",
      };

      const result = await resolver(resourceTypeInfo, resource, validInput);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Parent Resource Not Found");
      }
    });

    it("should return error when no approver type is configured", async () => {
      const mockGetResourceInfo = vi.fn();
      const resolver = createResolveApproverGroup(mockGetResourceInfo);

      const resourceTypeInfo = {
        isUpdatable: true,
        updateApprover: { approverType: "unknown" },
      };
      const resource = { pendingUpdateParams: null };

      const result = await resolver(resourceTypeInfo, resource, validInput);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Resource Type No Approver Group");
      }
    });
  });

  describe("createResolveSystemCatalog", () => {
    it("should resolve system catalog successfully", async () => {
      const mockCatalogConfig = { id: "stamp-system", name: "System Catalog" };
      const mockCatalogConfigProvider = {
        get: vi.fn().mockReturnValue(okAsync(some(mockCatalogConfig))),
      };

      const result = await createResolveSystemCatalog(mockCatalogConfigProvider);

      expect(result.isOk()).toBe(true);
      expect(mockCatalogConfigProvider.get).toHaveBeenCalledWith("stamp-system");
    });

    it("should return error when system catalog not found", async () => {
      const mockCatalogConfigProvider = {
        get: vi.fn().mockReturnValue(okAsync(none)),
      };

      const result = await createResolveSystemCatalog(mockCatalogConfigProvider);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.userMessage).toBe("Internal server error");
        expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
      }
    });

    it("should handle catalog provider errors", async () => {
      const mockCatalogConfigProvider = {
        get: vi.fn().mockReturnValue(errAsync(new Error("Provider error"))),
      };

      const result = await createResolveSystemCatalog(mockCatalogConfigProvider);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
      }
    });
  });

  describe("resolveApprovalFlow", () => {
    it("should find resource-update approval flow", async () => {
      const catalogConfig = {
        approvalFlows: [{ id: "other-flow" }, { id: "resource-update" }],
      };

      const result = await resolveApprovalFlow(catalogConfig);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect((result.value as { id: string }).id).toBe("resource-update");
      }
    });

    it("should return error when resource-update flow not found", async () => {
      const catalogConfig = {
        approvalFlows: [{ id: "other-flow" }, { id: "different-flow" }],
      };

      const result = await resolveApprovalFlow(catalogConfig);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
      }
    });
  });
});
