import { expect, it, describe, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";
import { StampHubError } from "../../error";
import { listByRequestUserIdWorkflow, ListByRequestUserIdInput } from "./list";

describe("listByRequestUserIdWorkflow", () => {
  const userId = "80ad2471-1326-a98e-ea2f-fc8146d09019";
  const requestUserId = "1ef4f797-c58a-47e5-8039-a5b2e78a798c";
  it("should return the expected result when the input is valid", async () => {
    const input: ListByRequestUserIdInput = {
      userId: userId,
      requestUserId: requestUserId,
    };

    const expected = {
      requestId: "1",
      catalogId: "catalog1",
      approvalFlowId: "approvalFlow1",
      requestUserId: requestUserId,
      requestDate: new Date(2024, 0, 1),
      approverId: "approver1",
      status: "pending",
    };
    const listByRequestUserIdSuccess = vi.fn().mockReturnValue(
      okAsync({
        items: [expected],
      })
    );
    const validateRequestUserIdSuccess = vi.fn().mockReturnValue(okAsync(input));

    const listByRequestUserIdResult = await listByRequestUserIdWorkflow(listByRequestUserIdSuccess, validateRequestUserIdSuccess)(input);
    if (listByRequestUserIdResult.isErr()) {
      throw listByRequestUserIdResult.error;
    }
    expect(listByRequestUserIdSuccess.mock.calls.length).toBe(1);
    expect(listByRequestUserIdSuccess.mock.calls[0][0]).toStrictEqual({ requestUserId: requestUserId, requestDate: undefined, paginationToken: undefined });
    expect(validateRequestUserIdSuccess.mock.calls.length).toBe(1);
    expect(validateRequestUserIdSuccess.mock.calls[0][0]).toStrictEqual({ userId: userId, requestUserId: requestUserId });
    expect(listByRequestUserIdResult.isOk()).toBe(true);
    expect(listByRequestUserIdResult.value).toEqual({ items: [expected] });
  });

  it("should return a BAD_REQUEST error when the user ID is invalid", async () => {
    const invalidUserId = "1234567890";
    const listByRequestUserIdSuccess = vi.fn().mockReturnValue(okAsync({ items: [] }));
    const validateRequestUserIdError = vi.fn().mockReturnValue(errAsync(new StampHubError("Request User not found", "Request User Not Found", "BAD_REQUEST")));

    const listByRequestUserIdResult = await listByRequestUserIdWorkflow(
      listByRequestUserIdSuccess,
      validateRequestUserIdError
    )({
      userId: invalidUserId,
      requestUserId: requestUserId,
    });
    if (listByRequestUserIdResult.isErr()) {
      expect(listByRequestUserIdResult.error.code).toBe("BAD_REQUEST");
    }
    expect(listByRequestUserIdSuccess.mock.calls.length).toBe(0);
    expect(validateRequestUserIdError.mock.calls.length).toBe(0);
    expect(listByRequestUserIdResult.isOk()).toBe(false);
  });

  it("should return a BAD_REQUEST error when the request user ID is invalid", async () => {
    const invalidRequestUserId = "1234567890";
    const listByRequestUserIdSuccess = vi.fn().mockReturnValue(okAsync({ items: [] }));
    const validateRequestUserIdError = vi.fn().mockReturnValue(errAsync(new StampHubError("Request User not found", "Request User Not Found", "BAD_REQUEST")));

    const listByRequestUserIdResult = await listByRequestUserIdWorkflow(
      listByRequestUserIdSuccess,
      validateRequestUserIdError
    )({
      userId: userId,
      requestUserId: invalidRequestUserId,
    });
    if (listByRequestUserIdResult.isErr()) {
      expect(listByRequestUserIdResult.error.code).toBe("BAD_REQUEST");
    }
    expect(listByRequestUserIdSuccess.mock.calls.length).toBe(0);
    expect(validateRequestUserIdError.mock.calls.length).toBe(0);
    expect(listByRequestUserIdResult.isOk()).toBe(false);
  });
});
