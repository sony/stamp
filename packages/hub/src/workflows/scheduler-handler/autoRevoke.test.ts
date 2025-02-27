import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { SchedulerEvent } from "@stamp-lib/stamp-types/models";
import { errAsync, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StampHubError } from "../../error";
import { autoRevokeEventHandler } from "./autoRevoke";

describe("autoRevokeEventHandler", () => {
  const mockRevokeWorkflow = vi.fn();
  const mockGetApprovalRequestDBProvider = vi.fn();
  const logger = createLogger("DEBUG", { moduleName: "hub" });

  const autoRevokeEventHandlerFn = autoRevokeEventHandler({
    revokeWorkflow: mockRevokeWorkflow,
    getApprovalRequestDBProvider: mockGetApprovalRequestDBProvider,
    logger,
  });

  const baseSchedulerEvent: SchedulerEvent = {
    id: "test-event-id",
    eventType: "test-event-type",
    property: {
      requestId: "test-request-id",
    },
    schedulePattern: { type: "cron", expression: "test-schedule-value" },
  };

  beforeEach(() => {
    mockRevokeWorkflow.mockClear();
    mockGetApprovalRequestDBProvider.mockClear();
  });

  it("should successfully revoke approval request", async () => {
    mockGetApprovalRequestDBProvider.mockReturnValue(
      okAsync(
        some({
          requestId: "test-request-id",
          status: "approvedActionSucceeded",
          userId: "test-user-id",
        })
      )
    );
    mockRevokeWorkflow.mockReturnValue(okAsync(undefined));

    const result = await autoRevokeEventHandlerFn(baseSchedulerEvent);

    expect(result.isOk()).toBe(true);
    expect(mockRevokeWorkflow).toHaveBeenCalledWith({
      userIdWhoRevoked: "system",
      revokedComment: "Auto revoke by system",
      approvalRequestId: "test-request-id",
    });
  });

  it("should return an error if approval request is not found", async () => {
    mockGetApprovalRequestDBProvider.mockReturnValue(okAsync(none));

    const result = await autoRevokeEventHandlerFn(baseSchedulerEvent);

    expect(result.isOk()).toBe(false);
    expect(result._unsafeUnwrapErr().message).toBe("Approval request not found");
    expect(mockRevokeWorkflow).not.toHaveBeenCalled();
  });

  it("should skip revoke if approval request status is not approvedActionSucceeded", async () => {
    mockGetApprovalRequestDBProvider.mockReturnValue(
      okAsync(
        some({
          requestId: "test-request-id",
          status: "pending",
          userId: "test-user-id",
        })
      )
    );

    const result = await autoRevokeEventHandlerFn(baseSchedulerEvent);

    expect(result.isOk()).toBe(true);
    expect(mockRevokeWorkflow).not.toHaveBeenCalled();
  });

  it("should handle error from approval request DB provider", async () => {
    const testError = new StampHubError("Test error", "Test error", "INTERNAL_SERVER_ERROR");
    mockGetApprovalRequestDBProvider.mockReturnValue(errAsync(testError));

    const result = await autoRevokeEventHandlerFn(baseSchedulerEvent);

    expect(result.isOk()).toBe(false);
    expect(mockRevokeWorkflow).not.toHaveBeenCalled();
  });

  it("should handle error from revoke workflow", async () => {
    mockGetApprovalRequestDBProvider.mockReturnValue(
      okAsync(
        some({
          requestId: "test-request-id",
          status: "approvedActionSucceeded",
          userId: "test-user-id",
        })
      )
    );

    const testError = new StampHubError("Revoke failed", "Revoke failed", "INTERNAL_SERVER_ERROR");
    mockRevokeWorkflow.mockReturnValue(errAsync(testError));

    const result = await autoRevokeEventHandlerFn(baseSchedulerEvent);

    expect(result.isOk()).toBe(false);
    expect(result._unsafeUnwrapErr().message).toBe("Revoke failed");
  });
});
