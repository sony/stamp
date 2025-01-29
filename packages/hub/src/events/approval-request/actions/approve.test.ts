import { expect, it, describe, vi } from "vitest";
import { executeApprovedAction, ExecuteApprovedActionInput } from "./approve";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { okAsync, ok, err } from "neverthrow";

// UUIDs are meaningless and were generated for testing.
const testInput: ExecuteApprovedActionInput = {
  userIdWhoApproved: "13f6d758-cea9-bfab-ffaf-9e012ddacf47",
  requestId: "38296685-5f00-ca43-5e7a-218e9eb7b423",
  requestDate: new Date().toISOString(),
  approvalFlowId: "test-approval-flow-id",
  requestUserId: "dbf33b00-8a5f-e045-4aa1-2d943cb659b6",
  approverId: "e96e40e8-af02-7643-82a5-9eb4a31737ec",
  inputParams: [{ id: "test-id", value: "test-value" }],
  inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
  status: "approved",
  catalogId: "test-catalog-id",
  approverType: "group",
  requestComment: "test request comment",
  validatedDate: new Date().toISOString(),
  validationHandlerResult: {
    isSuccess: true,
    message: "test validation success message",
  },
  approvedDate: new Date().toISOString(),
  approvedComment: "test approved comment",
};

describe("executeApprovedAction", () => {
  it("should return approved request if approval handler returns ok", async () => {
    const input = structuredClone(testInput);
    const approvalRequestApprovedHandlerMock = vi.fn().mockResolvedValue(
      ok({
        isSuccess: true,
        message: "test success message",
      })
    );
    const setApprovalRequestDBProviderMock = vi.fn((input) => okAsync(input));
    const result = await executeApprovedAction(approvalRequestApprovedHandlerMock, setApprovalRequestDBProviderMock)(input);

    expect(approvalRequestApprovedHandlerMock).toHaveBeenCalledWith({
      inputParams: {
        "test-id": { id: "test-id", value: "test-value" },
      },
      inputResources: {
        "test-resource-type-id": { resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" },
      },
      requestId: input.requestId,
      requestDate: input.requestDate,
      approvalFlowId: input.approvalFlowId,
      requestUserId: input.requestUserId,
      approverId: input.approverId,
      approvedDate: expect.any(String),
    });

    expect(setApprovalRequestDBProviderMock).toHaveBeenCalledWith({
      ...input,
      status: "approvedActionSucceeded",
      approvedDate: expect.any(String),
      approvedHandlerResult: {
        isSuccess: true,
        message: "test success message",
      },
    });

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toStrictEqual({
      ...input,
      status: "approvedActionSucceeded",
      approvedDate: expect.any(String),
      approvedHandlerResult: {
        isSuccess: true,
        message: "test success message",
      },
    });
  });

  it("should return approvedActionFailed status if approval handler's isSuccess is false", async () => {
    const input = structuredClone(testInput);
    const approvalRequestApprovedHandlerMock = vi.fn().mockResolvedValue(
      ok({
        isSuccess: false,
        message: "test failure message",
      })
    );
    const setApprovalRequestDBProviderMock = vi.fn((input) => okAsync(input));
    const result = await executeApprovedAction(approvalRequestApprovedHandlerMock, setApprovalRequestDBProviderMock)(input);

    expect(approvalRequestApprovedHandlerMock).toHaveBeenCalledWith({
      inputParams: {
        "test-id": { id: "test-id", value: "test-value" },
      },
      inputResources: {
        "test-resource-type-id": { resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" },
      },
      requestId: input.requestId,
      requestDate: input.requestDate,
      approvalFlowId: input.approvalFlowId,
      requestUserId: input.requestUserId,
      approverId: input.approverId,
      approvedDate: expect.any(String),
    });

    expect(setApprovalRequestDBProviderMock).toHaveBeenCalledWith({
      ...input,
      status: "approvedActionFailed",
      approvedDate: expect.any(String),
      approvedHandlerResult: {
        isSuccess: false,
        message: "test failure message",
      },
    });

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toStrictEqual({
      ...input,
      status: "approvedActionFailed",
      approvedDate: expect.any(String),
      approvedHandlerResult: {
        isSuccess: false,
        message: "test failure message",
      },
    });
  });

  it("should return error if approval handler returns error", async () => {
    const input = structuredClone(testInput);
    const approvalRequestApprovedHandlerMock = vi.fn().mockResolvedValue(err(new HandlerError("This is system error message", "INTERNAL_SERVER_ERROR")));
    const setApprovalRequestDBProviderMock = vi.fn((input) => okAsync(input));
    const result = await executeApprovedAction(approvalRequestApprovedHandlerMock, setApprovalRequestDBProviderMock)(input);

    expect(approvalRequestApprovedHandlerMock).toHaveBeenCalled();
    expect(setApprovalRequestDBProviderMock).not.toHaveBeenCalled();

    if (result.isOk()) {
      throw result.value;
    }

    expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.error.systemMessage).toBe("This is system error message");
    expect(result.error.userMessage).toBe("Unexpected error occurred");
  });

  it("should return error if DB provider returns error", async () => {
    const input = structuredClone(testInput);
    const approvalRequestApprovedHandlerMock = vi.fn().mockResolvedValue(
      ok({
        isSuccess: true,
        message: "test success message",
      })
    );
    const setApprovalRequestDBProviderMock = vi.fn().mockResolvedValue(err(new DBError("Unexpected error occurred", "INTERNAL_SERVER_ERROR")));
    const result = await executeApprovedAction(approvalRequestApprovedHandlerMock, setApprovalRequestDBProviderMock)(input);

    expect(approvalRequestApprovedHandlerMock).toHaveBeenCalled();
    expect(setApprovalRequestDBProviderMock).toHaveBeenCalled();

    if (result.isOk()) {
      throw result.value;
    }

    expect(result.error.message).toBe("Unexpected error occurred");
    expect(result.error.userMessage).toBe("INTERNAL_SERVER_ERROR");
  });
});
