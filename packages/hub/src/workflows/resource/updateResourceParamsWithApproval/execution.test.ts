import { describe, it, expect, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";
import { createLogger } from "@stamp-lib/stamp-logger";
import { createSubmitApprovalWorkflow, createUpdateResourcePendingParams, createExecuteApprovalWorkflow } from "./execution";
import { StampHubError } from "../../../error";

describe("updateResourceParamsWithApproval.execution", () => {
  const validInput = {
    catalogId: "cat-1",
    resourceTypeId: "type-1",
    resourceId: "res-1",
    updateParams: { foo: "bar" },
    requestUserId: "user-1",
    comment: "Test comment",
  };

  const mockApprovalRequest = {
    requestId: "req-1",
    requestDate: "2023-01-01T00:00:00Z",
  };

  // Complete mock for ResourceDBProvider
  const createMockResourceDBProvider = () => ({
    getById: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    updatePendingUpdateParams: vi.fn().mockReturnValue(okAsync(undefined)),
    createAuditNotification: vi.fn(),
    updateAuditNotification: vi.fn(),
    deleteAuditNotification: vi.fn(),
  });

  // Create logger using the actual createLogger function
  const logger = createLogger("DEBUG", { moduleName: "test" });

  describe("createSubmitApprovalWorkflow", () => {
    it("should submit workflow successfully", async () => {
      const mockSubmitWorkflow = vi.fn().mockReturnValue(okAsync(mockApprovalRequest));
      const submitFunc = createSubmitApprovalWorkflow(mockSubmitWorkflow);

      const result = await submitFunc("group-1", validInput);

      expect(result.isOk()).toBe(true);
      expect(mockSubmitWorkflow).toHaveBeenCalledWith({
        catalogId: "stamp-system",
        approvalFlowId: "resource-update",
        requestUserId: "user-1",
        inputParams: [
          { id: "catalogId", value: "cat-1" },
          { id: "resourceTypeId", value: "type-1" },
          { id: "resourceId", value: "res-1" },
          { id: "updateParams", value: JSON.stringify({ foo: "bar" }) },
        ],
        inputResources: [],
        approverType: "group",
        approverId: "group-1",
        requestComment: "Test comment",
      });
    });

    it("should handle missing comment gracefully", async () => {
      const mockSubmitWorkflow = vi.fn().mockReturnValue(okAsync(mockApprovalRequest));
      const submitFunc = createSubmitApprovalWorkflow(mockSubmitWorkflow);

      const inputWithoutComment = { ...validInput, comment: undefined };
      const result = await submitFunc("group-1", inputWithoutComment);

      expect(result.isOk()).toBe(true);
      expect(mockSubmitWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          requestComment: "",
        })
      );
    });

    it("should handle workflow submission errors", async () => {
      const mockSubmitWorkflow = vi.fn().mockReturnValue(errAsync(new Error("Workflow error")));
      const submitFunc = createSubmitApprovalWorkflow(mockSubmitWorkflow);

      const result = await submitFunc("group-1", validInput);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
      }
    });

    it("should preserve StampHubError from workflow", async () => {
      const stampHubError = new StampHubError("Workflow failed", "Workflow Failed", "BAD_REQUEST");
      const mockSubmitWorkflow = vi.fn().mockReturnValue(errAsync(stampHubError));
      const submitFunc = createSubmitApprovalWorkflow(mockSubmitWorkflow);

      const result = await submitFunc("group-1", validInput);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(stampHubError);
      }
    });
  });

  describe("createUpdateResourcePendingParams", () => {
    it("should update pending params successfully", async () => {
      const mockResourceDBProvider = createMockResourceDBProvider();

      const updateFunc = createUpdateResourcePendingParams(mockResourceDBProvider, logger);
      const result = await updateFunc(validInput, mockApprovalRequest);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ approvalRequestId: "req-1" });
      }

      expect(mockResourceDBProvider.updatePendingUpdateParams).toHaveBeenCalledWith({
        id: "res-1",
        catalogId: "cat-1",
        resourceTypeId: "type-1",
        pendingUpdateParams: {
          approvalRequestId: "req-1",
          updateParams: { foo: "bar" },
          requestUserId: "user-1",
          requestedAt: "2023-01-01T00:00:00Z",
        },
      });
    });

    it("should handle database update errors", async () => {
      const mockResourceDBProvider = createMockResourceDBProvider();
      mockResourceDBProvider.updatePendingUpdateParams.mockReturnValue(errAsync(new Error("DB error")));

      const updateFunc = createUpdateResourcePendingParams(mockResourceDBProvider, logger);
      const result = await updateFunc(validInput, mockApprovalRequest);

      expect(result.isErr()).toBe(true);
    });

    it("should handle StampHubError from database", async () => {
      const stampHubError = new StampHubError("DB failed", "Database Failed", "INTERNAL_SERVER_ERROR");
      const mockResourceDBProvider = createMockResourceDBProvider();
      mockResourceDBProvider.updatePendingUpdateParams.mockReturnValue(errAsync(stampHubError));

      const updateFunc = createUpdateResourcePendingParams(mockResourceDBProvider, logger);
      const result = await updateFunc(validInput, mockApprovalRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(StampHubError);
      }
    });

    it("should handle unknown error types gracefully", async () => {
      const mockResourceDBProvider = createMockResourceDBProvider();
      mockResourceDBProvider.updatePendingUpdateParams.mockReturnValue(errAsync("string error"));

      const updateFunc = createUpdateResourcePendingParams(mockResourceDBProvider, logger);
      const result = await updateFunc(validInput, mockApprovalRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
      }
    });
  });

  describe("createExecuteApprovalWorkflow", () => {
    it("should execute complete workflow successfully", async () => {
      const mockSubmitWorkflow = vi.fn().mockReturnValue(okAsync(mockApprovalRequest));
      const mockResourceDBProvider = createMockResourceDBProvider();

      const executeFunc = createExecuteApprovalWorkflow(mockSubmitWorkflow, mockResourceDBProvider, logger);

      const result = await executeFunc("group-1", validInput);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ approvalRequestId: "req-1" });
      }

      expect(mockSubmitWorkflow).toHaveBeenCalled();
      expect(mockResourceDBProvider.updatePendingUpdateParams).toHaveBeenCalled();
    });

    it("should handle workflow submission failure", async () => {
      const mockSubmitWorkflow = vi.fn().mockReturnValue(errAsync(new Error("Workflow error")));
      const mockResourceDBProvider = createMockResourceDBProvider();

      const executeFunc = createExecuteApprovalWorkflow(mockSubmitWorkflow, mockResourceDBProvider, logger);

      const result = await executeFunc("group-1", validInput);

      expect(result.isErr()).toBe(true);
      expect(mockResourceDBProvider.updatePendingUpdateParams).not.toHaveBeenCalled();
    });

    it("should handle database update failure after successful workflow submission", async () => {
      const mockSubmitWorkflow = vi.fn().mockReturnValue(okAsync(mockApprovalRequest));
      const mockResourceDBProvider = createMockResourceDBProvider();
      mockResourceDBProvider.updatePendingUpdateParams.mockReturnValue(errAsync(new Error("DB error")));

      const executeFunc = createExecuteApprovalWorkflow(mockSubmitWorkflow, mockResourceDBProvider, logger);

      const result = await executeFunc("group-1", validInput);

      expect(result.isErr()).toBe(true);
      expect(mockSubmitWorkflow).toHaveBeenCalled();
      expect(mockResourceDBProvider.updatePendingUpdateParams).toHaveBeenCalled();
    });
  });
});
