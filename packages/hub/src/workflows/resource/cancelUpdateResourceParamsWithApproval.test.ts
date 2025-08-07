import { describe, it, expect, vi } from "vitest";
import { cancelUpdateResourceParamsWithApproval } from "./cancelUpdateResourceParamsWithApproval";
import { okAsync, errAsync } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";
import { createLogger } from "@stamp-lib/stamp-logger";
import { ResourceOnDB } from "@stamp-lib/stamp-types/models";
import { StampHubError } from "../../error";

const now = new Date().toISOString();
const uuidUser = "11111111-1111-1111-1111-111111111111";
const uuidApprover = "22222222-2222-2222-2222-222222222222";
const uuidResource = "33333333-3333-3333-3333-333333333333";
const uuidApprovalRequest = "44444444-4444-4444-4444-444444444444";
const pendingUpdateParams: ResourceOnDB["pendingUpdateParams"] = {
  approvalRequestId: uuidApprovalRequest,
  updateParams: { foo: "bar" },
  requestUserId: uuidUser,
  requestedAt: now,
};
const resource: ResourceOnDB = {
  id: uuidResource,
  catalogId: "cat-1",
  resourceTypeId: "type-1",
  pendingUpdateParams,
};
const approvalRequest = {
  requestId: uuidApprovalRequest,
  status: "pending",
  catalogId: "cat-1",
  approvalFlowId: "stamp-system",
  requestUserId: uuidUser,
  approverType: "group",
  approverId: uuidApprover,
  requestDate: now,
  validatedDate: now,
  validationHandlerResult: { isSuccess: true, message: "ok" },
  inputParams: [],
  inputResources: [{ resourceId: uuidResource, resourceTypeId: "type-1" }],
  requestComment: "",
};

describe("cancelUpdateResourceWithApproval", () => {
  it("cancels a pending update and clears resource.pendingUpdateParams", async () => {
    const resourceDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(some(resource))),
      set: vi.fn(),
      updatePendingUpdateParams: vi.fn().mockReturnValue(okAsync({ ...resource, pendingUpdateParams: undefined })),
      delete: vi.fn(),
      createAuditNotification: vi.fn(),
      updateAuditNotification: vi.fn(),
      deleteAuditNotification: vi.fn(),
    };
    const canceledRequest = {
      ...approvalRequest,
      status: "canceled",
      canceledDate: now,
      userIdWhoCanceled: "system",
      cancelComment: "Cancelled by requester",
      validatedDate: now,
      validationHandlerResult: { isSuccess: true, message: "ok" },
    };
    const approvalRequestDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(some(approvalRequest))),
      updateStatusToCanceled: vi.fn().mockReturnValue(okAsync(canceledRequest)),
      listByApprovalFlowId: vi.fn(),
      listByRequestUserId: vi.fn(),
      listByApproverId: vi.fn(),
      set: vi.fn(),
      updateStatusToApproved: vi.fn(),
      updateStatusToRejected: vi.fn(),
      updateStatusToRevoked: vi.fn(),
    };

    const logger = createLogger("DEBUG", { moduleName: "test" });
    const checkCanEditResource = vi.fn().mockReturnValue(okAsync(true));
    const input = {
      catalogId: "cat-1",
      resourceTypeId: "type-1",
      resourceId: uuidResource,
      requestUserId: uuidUser,
      approvalRequestId: uuidApprovalRequest,
    };
    const result = await cancelUpdateResourceParamsWithApproval({
      resourceDBProvider,
      approvalRequestDBProvider,
      checkCanEditResource,
      logger,
    })(input);
    console.error("Test result:", result._unsafeUnwrap());
    expect(result.isOk()).toBe(true);
    expect(resourceDBProvider.updatePendingUpdateParams).toHaveBeenCalledWith({
      catalogId: "cat-1",
      resourceTypeId: "type-1",
      id: uuidResource,
      pendingUpdateParams: undefined,
    });
    expect(approvalRequestDBProvider.updateStatusToCanceled).toHaveBeenCalled();
  });

  it("returns error if resource not found", async () => {
    const resourceDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(none)),
      set: vi.fn(),
      updatePendingUpdateParams: vi.fn(),
      delete: vi.fn(),
      createAuditNotification: vi.fn(),
      updateAuditNotification: vi.fn(),
      deleteAuditNotification: vi.fn(),
    };
    const approvalRequestDBProvider = {
      getById: vi.fn(),
      updateStatusToCanceled: vi.fn(),
      listByApprovalFlowId: vi.fn(),
      listByRequestUserId: vi.fn(),
      listByApproverId: vi.fn(),
      set: vi.fn(),
      updateStatusToApproved: vi.fn(),
      updateStatusToRejected: vi.fn(),
      updateStatusToRevoked: vi.fn(),
    };

    const logger = createLogger("DEBUG", { moduleName: "test" });
    const input = {
      catalogId: "cat-1",
      resourceTypeId: "type-1",
      resourceId: "res-1",
      requestUserId: "user-1",
      approvalRequestId: "approval-123",
    };
    const result = await cancelUpdateResourceParamsWithApproval({
      resourceDBProvider,
      approvalRequestDBProvider,
      checkCanEditResource: vi.fn().mockReturnValue(okAsync(true)),

      logger,
    })(input);
    console.error("Test error:", result._unsafeUnwrapErr());
    expect(result.isErr()).toBe(true);
    expect((result._unsafeUnwrapErr() as { message: string }).message).toMatch(/Resource not found/);
  });

  it("returns error if no matching pending update", async () => {
    const resourceDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(some({ ...resource, pendingUpdateParams: undefined }))),
      set: vi.fn(),
      updatePendingUpdateParams: vi.fn(),
      delete: vi.fn(),
      createAuditNotification: vi.fn(),
      updateAuditNotification: vi.fn(),
      deleteAuditNotification: vi.fn(),
    };
    const approvalRequestDBProvider = {
      getById: vi.fn(),
      updateStatusToCanceled: vi.fn(),
      listByApprovalFlowId: vi.fn(),
      listByRequestUserId: vi.fn(),
      listByApproverId: vi.fn(),
      set: vi.fn(),
      updateStatusToApproved: vi.fn(),
      updateStatusToRejected: vi.fn(),
      updateStatusToRevoked: vi.fn(),
    };

    const logger = createLogger("DEBUG", { moduleName: "test" });
    const input = {
      catalogId: "cat-1",
      resourceTypeId: "type-1",
      resourceId: "res-1",
      requestUserId: "user-1",
      approvalRequestId: "approval-123",
    };
    const result = await cancelUpdateResourceParamsWithApproval({
      resourceDBProvider,
      approvalRequestDBProvider,
      checkCanEditResource: vi.fn().mockReturnValue(okAsync(true)),
      logger,
    })(input);
    expect(result.isErr()).toBe(true);
    expect((result._unsafeUnwrapErr() as { message: string }).message).toMatch(/No matching pending update/);
  });

  it("returns error if approval request not found", async () => {
    const resourceDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(some(resource))),
      set: vi.fn(),
      updatePendingUpdateParams: vi.fn(),
      delete: vi.fn(),
      createAuditNotification: vi.fn(),
      updateAuditNotification: vi.fn(),
      deleteAuditNotification: vi.fn(),
    };
    const approvalRequestDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(none)),
      updateStatusToCanceled: vi.fn(),
      listByApprovalFlowId: vi.fn(),
      listByRequestUserId: vi.fn(),
      listByApproverId: vi.fn(),
      set: vi.fn(),
      updateStatusToApproved: vi.fn(),
      updateStatusToRejected: vi.fn(),
      updateStatusToRevoked: vi.fn(),
    };

    const logger = createLogger("DEBUG", { moduleName: "test" });
    const input = {
      catalogId: "cat-1",
      resourceTypeId: "type-1",
      resourceId: "res-1",
      requestUserId: "user-1",
      approvalRequestId: "approval-123",
    };
    const result = await cancelUpdateResourceParamsWithApproval({
      checkCanEditResource: vi.fn().mockReturnValue(okAsync(true)),
      resourceDBProvider,
      approvalRequestDBProvider,
      logger,
    })(input);
    expect(result.isErr()).toBe(true);
    expect((result._unsafeUnwrapErr() as { message: string }).message).toMatch(/Approval request not found/);
  });

  it("clears pending update params when approval request is approvedActionFailed", async () => {
    const resourceDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(some(resource))),
      set: vi.fn(),
      updatePendingUpdateParams: vi.fn().mockReturnValue(okAsync({ ...resource, pendingUpdateParams: undefined })),
      delete: vi.fn(),
      createAuditNotification: vi.fn(),
      updateAuditNotification: vi.fn(),
      deleteAuditNotification: vi.fn(),
    };
    const approvalRequestDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(some({ ...approvalRequest, status: "approvedActionFailed" }))),
      updateStatusToCanceled: vi.fn(),
      listByApprovalFlowId: vi.fn(),
      listByRequestUserId: vi.fn(),
      listByApproverId: vi.fn(),
      set: vi.fn(),
      updateStatusToApproved: vi.fn(),
      updateStatusToRejected: vi.fn(),
      updateStatusToRevoked: vi.fn(),
    };

    const logger = createLogger("DEBUG", { moduleName: "test" });
    const input = {
      catalogId: "cat-1",
      resourceTypeId: "type-1",
      resourceId: uuidResource,
      requestUserId: uuidUser,
      approvalRequestId: uuidApprovalRequest,
    };
    const result = await cancelUpdateResourceParamsWithApproval({
      checkCanEditResource: vi.fn().mockReturnValue(okAsync(true)),
      resourceDBProvider,
      approvalRequestDBProvider,
      logger,
    })(input);

    expect(result.isOk()).toBe(true);
    expect(resourceDBProvider.updatePendingUpdateParams).toHaveBeenCalledWith({
      catalogId: "cat-1",
      resourceTypeId: "type-1",
      id: uuidResource,
      pendingUpdateParams: undefined,
    });
    // Should not call updateStatusToCanceled for approvedActionFailed
    expect(approvalRequestDBProvider.updateStatusToCanceled).not.toHaveBeenCalled();
  });

  it("clears pending update params when approval request is rejected", async () => {
    const resourceDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(some(resource))),
      set: vi.fn(),
      updatePendingUpdateParams: vi.fn().mockReturnValue(okAsync({ ...resource, pendingUpdateParams: undefined })),
      delete: vi.fn(),
      createAuditNotification: vi.fn(),
      updateAuditNotification: vi.fn(),
      deleteAuditNotification: vi.fn(),
    };
    const approvalRequestDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(some({ ...approvalRequest, status: "rejected" }))),
      updateStatusToCanceled: vi.fn(),
      listByApprovalFlowId: vi.fn(),
      listByRequestUserId: vi.fn(),
      listByApproverId: vi.fn(),
      set: vi.fn(),
      updateStatusToApproved: vi.fn(),
      updateStatusToRejected: vi.fn(),
      updateStatusToRevoked: vi.fn(),
    };

    const logger = createLogger("DEBUG", { moduleName: "test" });
    const input = {
      catalogId: "cat-1",
      resourceTypeId: "type-1",
      resourceId: uuidResource,
      requestUserId: uuidUser,
      approvalRequestId: uuidApprovalRequest,
    };
    const result = await cancelUpdateResourceParamsWithApproval({
      checkCanEditResource: vi.fn().mockReturnValue(okAsync(true)),
      resourceDBProvider,
      approvalRequestDBProvider,
      logger,
    })(input);

    expect(result.isOk()).toBe(true);
    expect(resourceDBProvider.updatePendingUpdateParams).toHaveBeenCalledWith({
      catalogId: "cat-1",
      resourceTypeId: "type-1",
      id: uuidResource,
      pendingUpdateParams: undefined,
    });
    // Should not call updateStatusToCanceled for rejected approval request
    expect(approvalRequestDBProvider.updateStatusToCanceled).not.toHaveBeenCalled();
  });

  it("returns error if approval request is not pending, approvedActionFailed, or rejected", async () => {
    const resourceDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(some(resource))),
      set: vi.fn(),
      updatePendingUpdateParams: vi.fn(),
      delete: vi.fn(),
      createAuditNotification: vi.fn(),
      updateAuditNotification: vi.fn(),
      deleteAuditNotification: vi.fn(),
    };
    const approvalRequestDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(some({ ...approvalRequest, status: "approved" }))),
      updateStatusToCanceled: vi.fn(),
      listByApprovalFlowId: vi.fn(),
      listByRequestUserId: vi.fn(),
      listByApproverId: vi.fn(),
      set: vi.fn(),
      updateStatusToApproved: vi.fn(),
      updateStatusToRejected: vi.fn(),
      updateStatusToRevoked: vi.fn(),
    };

    const logger = { info: vi.fn(), error: vi.fn(), fatal: vi.fn(), warn: vi.fn(), debug: vi.fn() };
    const input = {
      catalogId: "cat-1",
      resourceTypeId: "type-1",
      resourceId: "res-1",
      requestUserId: "user-1",
      approvalRequestId: "approval-123",
    };
    const result = await cancelUpdateResourceParamsWithApproval({
      checkCanEditResource: vi.fn().mockReturnValue(okAsync(true)),
      resourceDBProvider,
      approvalRequestDBProvider,
      logger,
    })(input);
    expect(result.isErr()).toBe(true);
    expect((result._unsafeUnwrapErr() as { message: string }).message).toMatch(/Approval request is not pending or approvedActionFailed/);
  });

  it("returns error if user cannot edit resource", async () => {
    const resourceDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(some(resource))),
      set: vi.fn(),
      updatePendingUpdateParams: vi.fn(),
      delete: vi.fn(),
      createAuditNotification: vi.fn(),
      updateAuditNotification: vi.fn(),
      deleteAuditNotification: vi.fn(),
    };
    const approvalRequestDBProvider = {
      getById: vi.fn().mockReturnValue(okAsync(some(approvalRequest))),
      updateStatusToCanceled: vi.fn(),
      listByApprovalFlowId: vi.fn(),
      listByRequestUserId: vi.fn(),
      listByApproverId: vi.fn(),
      set: vi.fn(),
      updateStatusToApproved: vi.fn(),
      updateStatusToRejected: vi.fn(),
      updateStatusToRevoked: vi.fn(),
    };

    const logger = createLogger("DEBUG", { moduleName: "test" });
    const checkCanEditResource = vi.fn().mockReturnValue(errAsync(new StampHubError("Permission denied", "Permission Denied", "FORBIDDEN")));
    const input = {
      catalogId: "cat-1",
      resourceTypeId: "type-1",
      resourceId: uuidResource,
      requestUserId: uuidUser,
      approvalRequestId: uuidApprovalRequest,
    };
    const result = await cancelUpdateResourceParamsWithApproval({
      resourceDBProvider,
      approvalRequestDBProvider,
      checkCanEditResource,
      logger,
    })(input);
    expect(result.isErr()).toBe(true);
    expect((result._unsafeUnwrapErr() as StampHubError).message).toBe("Permission denied");
    expect((result._unsafeUnwrapErr() as StampHubError).userMessage).toBe("Permission Denied");
    expect((result._unsafeUnwrapErr() as StampHubError).code).toBe("FORBIDDEN");

    // Verify that no DB operations are called when authorization fails
    expect(resourceDBProvider.getById).not.toHaveBeenCalled();
    expect(approvalRequestDBProvider.getById).not.toHaveBeenCalled();
    expect(resourceDBProvider.updatePendingUpdateParams).not.toHaveBeenCalled();
    expect(approvalRequestDBProvider.updateStatusToCanceled).not.toHaveBeenCalled();
  });
});
