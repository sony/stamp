import { validateApprovalRequestImpl } from "./validate";
import { expect, it, describe, vi, beforeEach } from "vitest";

import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ValidateApprovalRequestInput } from "./validate";

import { okAsync, ok, err } from "neverthrow";

describe("validateApprovalRequestImpl", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  it("should return ok if validation handler returns ok", async () => {
    // Mock the dependencies
    const input: ValidateApprovalRequestInput = {
      requestId: "018c8ae3-942a-783b-b320-4dcfdbb76d73",
      requestDate: new Date().toISOString(),
      approvalFlowId: "test-approval-flow-id",
      requestUserId: "ee835020-d668-421a-a0fe-96be5aebef84",
      approverId: "575021b7-128c-47eb-abc6-7abdabddc9bf",
      inputParams: [],
      inputResources: [],
      status: "submitted",
      catalogId: "test-catalog",
      approverType: "group",
      requestComment: "Test comment",
    };
    const approvalRequestValidationHandlerMock = vi.fn().mockResolvedValue(
      ok({
        isSuccess: true,
        message: "This is message",
      })
    );
    const setApprovalRequestDBProviderMock = vi.fn().mockImplementation((input) => okAsync(input));

    // Call the function
    const result = await validateApprovalRequestImpl(input, approvalRequestValidationHandlerMock, setApprovalRequestDBProviderMock);

    // Assertions
    expect(approvalRequestValidationHandlerMock).toHaveBeenCalledWith({
      inputParams: {},
      inputResources: {},
      requestId: input.requestId,
      requestDate: input.requestDate,
      approvalFlowId: input.approvalFlowId,
      requestUserId: input.requestUserId,
      approverId: input.approverId,
    });

    expect(setApprovalRequestDBProviderMock).toHaveBeenCalledWith({
      ...input,
      status: "pending",
      validatedDate: expect.any(String),
      validationHandlerResult: {
        isSuccess: true,
        message: "This is message",
      },
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toStrictEqual({
      ...input,
      status: "pending",
      validatedDate: expect.any(String),
      validationHandlerResult: {
        isSuccess: true,
        message: "This is message",
      },
    });
  });

  it("should return validationFailed status if validation handler's isSuccess is false", async () => {
    // Mock the dependencies
    const input: ValidateApprovalRequestInput = {
      requestId: "018c8ae3-942a-783b-b320-4dcfdbb76d73",
      requestDate: new Date().toISOString(),
      approvalFlowId: "test-approval-flow-id",
      requestUserId: "ee835020-d668-421a-a0fe-96be5aebef84",
      approverId: "575021b7-128c-47eb-abc6-7abdabddc9bf",
      inputParams: [],
      inputResources: [],
      status: "submitted",
      catalogId: "test-catalog",
      approverType: "group",
      requestComment: "Test comment",
    };
    const approvalRequestValidationHandlerMock = vi.fn().mockResolvedValue(
      ok({
        isSuccess: false,
        message: "This is message",
      })
    );
    const setApprovalRequestDBProviderMock = vi.fn().mockImplementation((input) => okAsync(input));

    // Call the function
    const result = await validateApprovalRequestImpl(input, approvalRequestValidationHandlerMock, setApprovalRequestDBProviderMock);

    // Assertions
    expect(approvalRequestValidationHandlerMock).toHaveBeenCalledWith({
      inputParams: {},
      inputResources: {},
      requestId: input.requestId,
      requestDate: input.requestDate,
      approvalFlowId: input.approvalFlowId,
      requestUserId: input.requestUserId,
      approverId: input.approverId,
    });

    expect(setApprovalRequestDBProviderMock).toHaveBeenCalledWith({
      ...input,
      status: "validationFailed",
      validatedDate: expect.any(String),
      validationHandlerResult: {
        isSuccess: false,
        message: "This is message",
      },
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toStrictEqual({
      ...input,
      status: "validationFailed",
      validatedDate: expect.any(String),
      validationHandlerResult: {
        isSuccess: false,
        message: "This is message",
      },
    });
  });

  it("should pass inputParams and inputResources for handler", async () => {
    // Mock the dependencies
    const input: ValidateApprovalRequestInput = {
      requestId: "018c8ae3-942a-783b-b320-4dcfdbb76d73",
      requestDate: new Date().toISOString(),
      approvalFlowId: "test-approval-flow-id",
      requestUserId: "ee835020-d668-421a-a0fe-96be5aebef84",
      approverId: "575021b7-128c-47eb-abc6-7abdabddc9bf",
      inputParams: [
        { id: "string-input", value: "test-input-param-value" },
        { id: "number-input", value: 1 },
        { id: "boolean-input", value: true },
      ],
      inputResources: [
        { resourceId: "test-resource-id", resourceTypeId: "test-resource-type-id" },
        { resourceId: "test-resource-id-2", resourceTypeId: "test-resource-type-id-2" },
      ],
      status: "submitted",
      catalogId: "test-catalog",
      approverType: "group",
      requestComment: "Test comment",
    };
    const approvalRequestValidationHandlerMock = vi.fn().mockResolvedValue(
      ok({
        isSuccess: true,
        message: "This is message",
      })
    );
    const setApprovalRequestDBProviderMock = vi.fn().mockImplementation((input) => okAsync(input));

    // Call the function
    const result = await validateApprovalRequestImpl(input, approvalRequestValidationHandlerMock, setApprovalRequestDBProviderMock);
    // Assertions
    expect(approvalRequestValidationHandlerMock).toHaveBeenCalledWith({
      inputParams: {
        "string-input": { id: "string-input", value: "test-input-param-value" },
        "number-input": { id: "number-input", value: 1 },
        "boolean-input": { id: "boolean-input", value: true },
      },
      inputResources: {
        "test-resource-type-id": {
          resourceId: "test-resource-id",
          resourceTypeId: "test-resource-type-id",
        },
        "test-resource-type-id-2": {
          resourceId: "test-resource-id-2",
          resourceTypeId: "test-resource-type-id-2",
        },
      },
      requestId: input.requestId,
      requestDate: input.requestDate,
      approvalFlowId: input.approvalFlowId,
      requestUserId: input.requestUserId,
      approverId: input.approverId,
    });

    expect(setApprovalRequestDBProviderMock).toHaveBeenCalledWith({
      ...input,
      status: "pending",
      validatedDate: expect.any(String),
      validationHandlerResult: {
        isSuccess: true,
        message: "This is message",
      },
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toStrictEqual({
      ...input,
      status: "pending",
      validatedDate: expect.any(String),
      validationHandlerResult: {
        isSuccess: true,
        message: "This is message",
      },
    });
  });

  it("should return error if validation handler returns error", async () => {
    // Mock the dependencies
    const input: ValidateApprovalRequestInput = {
      requestId: "018c8ae3-942a-783b-b320-4dcfdbb76d73",
      requestDate: new Date().toISOString(),
      approvalFlowId: "test-approval-flow-id",
      requestUserId: "ee835020-d668-421a-a0fe-96be5aebef84",
      approverId: "575021b7-128c-47eb-abc6-7abdabddc9bf",
      inputParams: [],
      inputResources: [],
      status: "submitted",
      catalogId: "test-catalog",
      approverType: "group",
      requestComment: "Test comment",
    };
    const approvalRequestValidationHandlerMock = vi.fn().mockResolvedValue(err(new HandlerError("This is system error message", "INTERNAL_SERVER_ERROR")));
    const setApprovalRequestDBProviderMock = vi.fn().mockImplementation((input) => okAsync(input));

    // Call the function
    const result = await validateApprovalRequestImpl(input, approvalRequestValidationHandlerMock, setApprovalRequestDBProviderMock);

    // Assertions
    expect(approvalRequestValidationHandlerMock).toHaveBeenCalled();
    expect(setApprovalRequestDBProviderMock).not.toHaveBeenCalled();

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw result.value;
    }

    console.log("result.error", result.error);

    expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.error.systemMessage).toBe("This is system error message");
    // HandlerError message is not exposed to the user
    expect(result.error.userMessage).toBe("Unexpected error occurred");
  });

  it("should return error if validation handler throws error", async () => {
    // Mock the dependencies
    const input: ValidateApprovalRequestInput = {
      requestId: "018c8ae3-942a-783b-b320-4dcfdbb76d73",
      requestDate: new Date().toISOString(),
      approvalFlowId: "test-approval-flow-id",
      requestUserId: "ee835020-d668-421a-a0fe-96be5aebef84",
      approverId: "575021b7-128c-47eb-abc6-7abdabddc9bf",
      inputParams: [],
      inputResources: [],
      status: "submitted",
      catalogId: "test-catalog",
      approverType: "group",
      requestComment: "Test comment",
    };
    const approvalRequestValidationHandlerMock = vi.fn().mockRejectedValue(new Error("This is system error message"));
    const setApprovalRequestDBProviderMock = vi.fn().mockImplementation((input) => okAsync(input));

    // Call the function
    const result = await validateApprovalRequestImpl(input, approvalRequestValidationHandlerMock, setApprovalRequestDBProviderMock);

    // Assertions
    expect(approvalRequestValidationHandlerMock).toHaveBeenCalled();
    expect(setApprovalRequestDBProviderMock).not.toHaveBeenCalled();

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw result.value;
    }

    expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.error.systemMessage).toBe("This is system error message");
    // Error message is not exposed to the user
    expect(result.error.userMessage).toBe("Unexpected error occurred");
  });
});
