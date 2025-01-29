import { expect, it, describe, vi } from "vitest";
import { revokeApprovalRequest, RevokeApprovalRequestInput } from "./revoke";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { okAsync, ok, err } from "neverthrow";

// UUIDs are meaningless and were generated for testing.
const testInput: RevokeApprovalRequestInput = {
  revokedComment: "test revoked comment",
  userIdWhoRevoked: "aedfe88a-7f6b-4573-83ac-af635ea39d16", // random UUID
  approvedComment: "test approved comment",
  userIdWhoApproved: "bc430b4e-9edd-dfdb-82fd-372b7b5ba403",
  requestId: "718a4f73-2627-c128-5f85-149e3e8ee9da",
  requestDate: new Date().toISOString(),
  approvalFlowId: "test-approval-flow-id",
  requestUserId: "623c1970-66d3-ce36-138a-62ca33c1efd8",
  approverId: "7f7534b1-8337-2b65-6f4f-b83ebec75344",
  inputParams: [{ id: "test-id", value: "test-value" }],
  inputResources: [{ resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" }],
  status: "revoked",
  catalogId: "test-catalog-id",
  approverType: "group",
  requestComment: "test request comment",
  validatedDate: new Date().toISOString(),
  validationHandlerResult: {
    isSuccess: true,
    message: "test validation success message",
  },
  approvedDate: new Date().toISOString(),
  approvedHandlerResult: {
    isSuccess: true,
    message: "test approval success message",
  },
  revokedDate: new Date().toISOString(),
};

describe("revokeApprovalRequest", () => {
  it("should return revoked request if revocation handler returns ok", async () => {
    const input = structuredClone(testInput);
    const approvalRequestRevocationHandlerMock = vi.fn().mockResolvedValue(
      ok({
        isSuccess: true,
        message: "test success message",
      })
    );
    const setApprovalRequestDBProviderMock = vi.fn((input) => okAsync(input));
    const result = await revokeApprovalRequest(approvalRequestRevocationHandlerMock, setApprovalRequestDBProviderMock)(input);

    expect(approvalRequestRevocationHandlerMock).toHaveBeenCalledWith({
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
      revokedDate: expect.any(String),
    });

    expect(setApprovalRequestDBProviderMock).toHaveBeenCalledWith({
      ...input,
      status: "revokedActionSucceeded",
      revokedDate: expect.any(String),
      revokedHandlerResult: {
        isSuccess: true,
        message: "test success message",
      },
    });

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toStrictEqual({
      ...input,
      status: "revokedActionSucceeded",
      revokedDate: expect.any(String),
      revokedHandlerResult: {
        isSuccess: true,
        message: "test success message",
      },
    });
  });

  it("should return revokedActionFailed status if revocation handler's isSuccess is false", async () => {
    const input = structuredClone(testInput);
    const approvalRequestRevocationHandlerMock = vi.fn().mockResolvedValue(
      ok({
        isSuccess: false,
        message: "test failure message",
      })
    );
    const setApprovalRequestDBProviderMock = vi.fn((input) => okAsync(input));
    const result = await revokeApprovalRequest(approvalRequestRevocationHandlerMock, setApprovalRequestDBProviderMock)(input);

    expect(approvalRequestRevocationHandlerMock).toHaveBeenCalledWith({
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
      revokedDate: expect.any(String),
    });

    expect(setApprovalRequestDBProviderMock).toHaveBeenCalledWith({
      ...input,
      status: "revokedActionFailed",
      revokedDate: expect.any(String),
      revokedHandlerResult: {
        isSuccess: false,
        message: "test failure message",
      },
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toStrictEqual({
      ...input,
      status: "revokedActionFailed",
      revokedDate: expect.any(String),
      revokedHandlerResult: {
        isSuccess: false,
        message: "test failure message",
      },
    });
  });

  it("should return error if revocation handler returns error", async () => {
    const input = structuredClone(testInput);
    const approvalRequestRevocationHandlerMock = vi.fn().mockResolvedValue(err(new HandlerError("This is system error message", "INTERNAL_SERVER_ERROR")));
    const setApprovalRequestDBProviderMock = vi.fn((input) => okAsync(input));
    const result = await revokeApprovalRequest(approvalRequestRevocationHandlerMock, setApprovalRequestDBProviderMock)(input);

    expect(approvalRequestRevocationHandlerMock).toHaveBeenCalled();
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
    const approvalRequestRevocationHandlerMock = vi.fn().mockResolvedValue(
      ok({
        isSuccess: true,
        message: "test success message",
      })
    );
    const setApprovalRequestDBProviderMock = vi.fn().mockResolvedValue(err(new DBError("Unexpected error occurred", "INTERNAL_SERVER_ERROR")));
    const result = await revokeApprovalRequest(approvalRequestRevocationHandlerMock, setApprovalRequestDBProviderMock)(input);

    expect(approvalRequestRevocationHandlerMock).toHaveBeenCalled();
    expect(setApprovalRequestDBProviderMock).toHaveBeenCalled();

    if (result.isOk()) {
      throw result.value;
    }

    expect(result.error.message).toBe("Unexpected error occurred");
    expect(result.error.userMessage).toBe("INTERNAL_SERVER_ERROR");
  });
});
