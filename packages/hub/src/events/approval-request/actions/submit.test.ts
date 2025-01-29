import { submitApprovalRequestImpl } from "./submit";
import { expect, it, describe, vi, beforeEach } from "vitest";

import { SubmitApprovalRequestInput } from "./submit";
import { okAsync, errAsync } from "neverthrow";

import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";

describe("submitApprovalRequestImpl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return a SubmittedRequest if input is valid", async () => {
    // Mock the dependencies
    const input: SubmitApprovalRequestInput = {
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow-id",
      inputParams: [],
      inputResources: [],
      requestUserId: "ee835020-d668-421a-a0fe-96be5aebef84",
      approverType: "group",
      approverId: "575021b7-128c-47eb-abc6-7abdabddc9bf",
      requestComment: "This is comment",
    };
    const setApprovalRequestDBProviderMock = vi.fn().mockImplementation((input) => okAsync(input));

    // Call the function
    const result = await submitApprovalRequestImpl(input, setApprovalRequestDBProviderMock);

    // Assertions
    expect(setApprovalRequestDBProviderMock).toHaveBeenCalledWith({
      ...input,
      requestId: expect.any(String),
      status: "submitted",
      requestDate: expect.any(String),
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toStrictEqual({
      ...input,
      requestId: expect.any(String),
      status: "submitted",
      requestDate: expect.any(String),
    });
  });

  it("should return a StampHubError if setApprovalRequestDBProvider fails", async () => {
    // Mock the dependencies
    const input: SubmitApprovalRequestInput = {
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow-id",
      inputParams: [],
      inputResources: [],
      requestUserId: "ee835020-d668-421a-a0fe-96be5aebef84",
      approverType: "group",
      approverId: "575021b7-128c-47eb-abc6-7abdabddc9bf",
      requestComment: "This is comment",
    };
    const setApprovalRequestDBProviderMock = vi.fn().mockImplementation(() => errAsync(new DBError("DB error")));

    // Call the function
    const result = await submitApprovalRequestImpl(input, setApprovalRequestDBProviderMock);
    console.log(result);
    // Assertions
    expect(setApprovalRequestDBProviderMock).toHaveBeenCalled();

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw result.value;
    }

    expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.error.systemMessage).toBe("DB error");
    expect(result.error.userMessage).toBe("Unexpected error occurred");
  });
});
