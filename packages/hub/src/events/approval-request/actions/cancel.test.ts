import { cancelApprovalRequest, CancelApprovalRequestInput } from "./cancel";
import { expect, it, describe, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";

const testInput: CancelApprovalRequestInput = {
  catalogId: "test-catalog-id",
  approvalFlowId: "test-approval-flow-id",
  requestId: "test-request-id",
  canceledDate: new Date().toISOString(),
  userIdWhoCanceled: "system",
  cancelComment: "test cancel comment",
};

describe("cancelApprovalRequest", () => {
  it("should return a canceledRequest if input is valid and userIdWhoCanceled is 'system'", async () => {
    const input = structuredClone(testInput);
    const updateStatusToCanceledMock = vi.fn().mockImplementation((input) => okAsync(input));
    const fn = cancelApprovalRequest(updateStatusToCanceledMock);
    const result = await fn(input);

    expect(updateStatusToCanceledMock).toHaveBeenCalledWith({
      ...input,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toStrictEqual({
      ...input,
    });
  });

  it("should return a StampHubError if userIdWhoCanceled is not 'system'", async () => {
    const input = { ...testInput, userIdWhoCanceled: "11111111-1111-1111-1111-111111111111" };
    const updateStatusToCanceledMock = vi.fn();
    const fn = cancelApprovalRequest(updateStatusToCanceledMock);
    const result = await fn(input);

    expect(updateStatusToCanceledMock).not.toHaveBeenCalled();
    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw result.value;
    }
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(result.error.userMessage).toBe("Invalid User ID for Canceling Approval Request");
  });

  it("should return a StampHubError if DB Provider fails", async () => {
    const input = structuredClone(testInput);
    const updateStatusToCanceledMock = vi.fn().mockImplementation(() => errAsync(new DBError("DB error")));
    const fn = cancelApprovalRequest(updateStatusToCanceledMock);
    const result = await fn(input);

    expect(updateStatusToCanceledMock).toHaveBeenCalled();
    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw result.value;
    }
    expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.error.systemMessage).toBe("DB error");
    expect(result.error.userMessage).toBe("Unexpected error occurred");
  });
});
