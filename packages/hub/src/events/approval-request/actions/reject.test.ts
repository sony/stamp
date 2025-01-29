import { rejectApprovalRequestImpl, RejectApprovalRequestInput } from "./reject";
import { expect, it, describe, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";

import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";

// UUIDs are meaningless and were generated for testing.
const testInput: RejectApprovalRequestInput = {
  rejectComment: "test rejected comment",
  userIdWhoRejected: "4c2905a7-2320-f261-d550-879bd794cbd4",
  requestId: "91088c89-48f6-c1ba-ac35-f170ba1ea31b",
  approvalFlowId: "test-approval-flow-id",
  catalogId: "test-catalog-id",
};

describe("rejectApprovalRequestImpl", () => {
  it("should return a rejectedRequest if input is valid", async () => {
    const input = structuredClone(testInput);
    const updateStatusToRejectedMock = vi.fn().mockImplementation((input) => okAsync(input));
    const result = await rejectApprovalRequestImpl(input, updateStatusToRejectedMock);

    expect(updateStatusToRejectedMock).toHaveBeenCalledWith({
      ...input,
      rejectedDate: expect.any(String),
    });

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toStrictEqual({
      ...input,
      rejectedDate: expect.any(String),
    });
  });

  it("should return a StampHubError if DB Provider fails", async () => {
    const input = structuredClone(testInput);
    const updateStatusToRejectedMock = vi.fn().mockImplementation(() => errAsync(new DBError("DB error")));
    const result = await rejectApprovalRequestImpl(input, updateStatusToRejectedMock);

    expect(updateStatusToRejectedMock).toHaveBeenCalled();

    if (result.isOk()) {
      throw result.value;
    }

    expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.error.systemMessage).toBe("DB error");
    expect(result.error.userMessage).toBe("Unexpected error occurred");
  });
});
