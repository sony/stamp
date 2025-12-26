import { describe, it, expect, vi } from "vitest";
import { enrichInputDataForNotification } from "./enrichForNotification";
import { PendingRequest, ApprovalFlowConfig, CatalogConfig } from "@stamp-lib/stamp-types/models";
import { createLogger } from "@stamp-lib/stamp-logger";
import { some, none } from "@stamp-lib/stamp-option";
import { ok } from "neverthrow";

describe("enrichInputDataForNotification", () => {
  const logger = createLogger("DEBUG", { moduleName: "test" });

  const basePendingRequest: PendingRequest = {
    requestId: "test-request-id",
    status: "pending",
    catalogId: "test-catalog",
    approvalFlowId: "test-approval-flow",
    inputParams: [],
    inputResources: [],
    requestUserId: "test-user-id",
    approverType: "group",
    approverId: "test-approver-id",
    requestDate: "2024-01-01T00:00:00.000Z",
    requestComment: "Test request comment",
    validatedDate: "2024-01-01T00:00:00.000Z",
    validationHandlerResult: {
      isSuccess: true as const,
      message: "Validation passed",
    },
  };

  const baseApprovalFlowConfig: ApprovalFlowConfig = {
    id: "test-approval-flow",
    name: "Test Approval Flow",
    description: "Test description",
    inputParams: [],
    inputResources: [],
    approver: { approverType: "approvalFlow" },
    handlers: {
      approvalRequestValidation: vi.fn(),
      approved: vi.fn(),
      revoked: vi.fn(),
    },
  };

  const baseCatalogConfig: CatalogConfig = {
    id: "test-catalog",
    name: "Test Catalog",
    description: "Test catalog description",
    approvalFlows: [],
    resourceTypes: [],
  };

  describe("enrichInputParamsWithNames", () => {
    it("should return empty array when inputParams is empty", async () => {
      const result = await enrichInputDataForNotification(logger, baseCatalogConfig, baseApprovalFlowConfig)(basePendingRequest);

      expect(result.isOk()).toBe(true);
      const data = result._unsafeUnwrap();
      expect(data.inputParamsWithNames).toEqual([]);
    });

    it("should enrich input params with names from approval flow config", async () => {
      const approvalFlowConfig: ApprovalFlowConfig = {
        ...baseApprovalFlowConfig,
        inputParams: [
          { id: "param1", name: "Parameter One", type: "string", required: true },
          { id: "param2", name: "Parameter Two", type: "number", required: false },
        ],
      };

      const pendingRequest: PendingRequest = {
        ...basePendingRequest,
        inputParams: [
          { id: "param1", value: "test-value" },
          { id: "param2", value: 123 },
        ],
      };

      const result = await enrichInputDataForNotification(logger, baseCatalogConfig, approvalFlowConfig)(pendingRequest);

      expect(result.isOk()).toBe(true);
      const data = result._unsafeUnwrap();
      expect(data.inputParamsWithNames).toEqual([
        { id: "param1", name: "Parameter One", value: "test-value" },
        { id: "param2", name: "Parameter Two", value: 123 },
      ]);
    });

    it("should fallback to ID when param not found in config", async () => {
      const pendingRequest: PendingRequest = {
        ...basePendingRequest,
        inputParams: [{ id: "unknown-param", value: "test-value" }],
      };

      const result = await enrichInputDataForNotification(logger, baseCatalogConfig, baseApprovalFlowConfig)(pendingRequest);

      expect(result.isOk()).toBe(true);
      const data = result._unsafeUnwrap();
      expect(data.inputParamsWithNames).toEqual([{ id: "unknown-param", name: "unknown-param", value: "test-value" }]);
    });

    it("should handle boolean values", async () => {
      const approvalFlowConfig: ApprovalFlowConfig = {
        ...baseApprovalFlowConfig,
        inputParams: [{ id: "boolParam", name: "Boolean Parameter", type: "boolean", required: true }],
      };

      const pendingRequest: PendingRequest = {
        ...basePendingRequest,
        inputParams: [{ id: "boolParam", value: true }],
      };

      const result = await enrichInputDataForNotification(logger, baseCatalogConfig, approvalFlowConfig)(pendingRequest);

      expect(result.isOk()).toBe(true);
      const data = result._unsafeUnwrap();
      expect(data.inputParamsWithNames[0].value).toBe(true);
    });
  });

  describe("enrichInputResourcesWithNames", () => {
    it("should return empty array when inputResources is empty", async () => {
      const result = await enrichInputDataForNotification(logger, baseCatalogConfig, baseApprovalFlowConfig)(basePendingRequest);

      expect(result.isOk()).toBe(true);
      const data = result._unsafeUnwrap();
      expect(data.inputResourcesWithNames).toEqual([]);
    });

    it("should enrich input resources with names from catalog handler", async () => {
      const mockGetResource = vi.fn().mockResolvedValue(
        ok(
          some({
            resourceId: "res1",
            name: "Resource One",
            params: {},
          })
        )
      );

      const catalogConfig: CatalogConfig = {
        ...baseCatalogConfig,
        resourceTypes: [
          {
            id: "resource-type-1",
            name: "Resource Type One",
            description: "Test resource type",
            createParams: [],
            infoParams: [],
            handlers: {
              getResource: mockGetResource,
              listResources: vi.fn(),
              createResource: vi.fn(),
              deleteResource: vi.fn(),
              updateResource: vi.fn(),
              listResourceAuditItem: vi.fn(),
            },
            isCreatable: true,
            isUpdatable: true,
            isDeletable: true,
            ownerManagement: false,
            approverManagement: false,
          },
        ],
      };

      const pendingRequest: PendingRequest = {
        ...basePendingRequest,
        inputResources: [{ resourceTypeId: "resource-type-1", resourceId: "res1" }],
      };

      const result = await enrichInputDataForNotification(logger, catalogConfig, baseApprovalFlowConfig)(pendingRequest);

      expect(result.isOk()).toBe(true);
      const data = result._unsafeUnwrap();
      expect(data.inputResourcesWithNames).toEqual([
        {
          resourceTypeId: "resource-type-1",
          resourceTypeName: "Resource Type One",
          resourceId: "res1",
          resourceName: "Resource One",
        },
      ]);
    });

    it("should fallback to ID when resource not found", async () => {
      const mockGetResource = vi.fn().mockResolvedValue(ok(none));

      const catalogConfig: CatalogConfig = {
        ...baseCatalogConfig,
        resourceTypes: [
          {
            id: "resource-type-1",
            name: "Resource Type One",
            description: "Test resource type",
            createParams: [],
            infoParams: [],
            handlers: {
              getResource: mockGetResource,
              listResources: vi.fn(),
              createResource: vi.fn(),
              deleteResource: vi.fn(),
              updateResource: vi.fn(),
              listResourceAuditItem: vi.fn(),
            },
            isCreatable: true,
            isUpdatable: true,
            isDeletable: true,
            ownerManagement: false,
            approverManagement: false,
          },
        ],
      };

      const pendingRequest: PendingRequest = {
        ...basePendingRequest,
        inputResources: [{ resourceTypeId: "resource-type-1", resourceId: "not-found-id" }],
      };

      const result = await enrichInputDataForNotification(logger, catalogConfig, baseApprovalFlowConfig)(pendingRequest);

      expect(result.isOk()).toBe(true);
      const data = result._unsafeUnwrap();
      expect(data.inputResourcesWithNames).toEqual([
        {
          resourceTypeId: "resource-type-1",
          resourceTypeName: "Resource Type One",
          resourceId: "not-found-id",
          resourceName: "not-found-id",
        },
      ]);
    });

    it("should fallback to IDs when resource type config not found", async () => {
      const pendingRequest: PendingRequest = {
        ...basePendingRequest,
        inputResources: [{ resourceTypeId: "unknown-type", resourceId: "res1" }],
      };

      const result = await enrichInputDataForNotification(logger, baseCatalogConfig, baseApprovalFlowConfig)(pendingRequest);

      expect(result.isOk()).toBe(true);
      const data = result._unsafeUnwrap();
      expect(data.inputResourcesWithNames).toEqual([
        {
          resourceTypeId: "unknown-type",
          resourceTypeName: "unknown-type",
          resourceId: "res1",
          resourceName: "res1",
        },
      ]);
    });
  });
});
