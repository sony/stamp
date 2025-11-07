import { describe, expect, it, vi } from "vitest";
import { notifySlack, generateMessageFromPendingRequest } from "./approvalRequest";
import { PendingRequest } from "@stamp-lib/stamp-types/models";
import { createLogger } from "@stamp-lib/stamp-logger";
import { ok } from "neverthrow";
import { some } from "@stamp-lib/stamp-option";

describe("notifySlack", () => {
  const slackBotToken = process.env.SLACK_BOT_TOKEN!;
  const slackChannelId = process.env.SLACK_CHANNEL_ID!;
  const customMessage = `Unit Test`;
  const messagePayload = `*Message:* This is a unit test notification, please ignore it.`;
  const requestComment = `*Request Comment*\nIt's a unit test`;
  const requestId = "1234567890";

  it("Success case with valid token and existing channel", async () => {
    const response = await notifySlack(slackBotToken, slackChannelId, customMessage, messagePayload, requestComment, requestId);
    expect(response.ok).toBe(true);
  });

  it("Failure case with invalid token", async () => {
    const errorSlackBotToken = "invalid-token";
    try {
      await notifySlack(errorSlackBotToken, slackChannelId, customMessage, messagePayload, requestComment, requestId);
    } catch (error) {
      // An error occurred with the content: Failed to call chat.postMessage due to invalid_auth
      expect((error as Error).message.includes("invalid_auth")).toBe(true);
    }
  });

  it("Failure case specifying not exist channel", async () => {
    const errorSlackChannelId = "#not-exist";
    try {
      await notifySlack(slackBotToken, errorSlackChannelId, customMessage, messagePayload, requestComment, requestId);
    } catch (error) {
      // An error occurred with the content: Failed to call chat.postMessage due to channel_not_found
      expect((error as Error).message.includes("channel_not_found")).toBe(true);
    }
  });
});

describe("generateMessageFromPendingRequest", () => {
  const logger = createLogger("DEBUG", { moduleName: "test" });

  const basePendingRequest: PendingRequest = {
    requestId: "test-request-id",
    status: "pending",
    catalogId: "test-catalog",
    approvalFlowId: "test-approval-flow",
    inputParams: [],
    inputResources: [],
    requestUserId: "test-user-id",
    approverType: "group",
    approverId: "test-approver-id",
    requestDate: "2024-01-01T00:00:00.000Z",
    requestComment: "Test request comment",
    validatedDate: "2024-01-01T00:00:00.000Z",
    validationHandlerResult: {
      isSuccess: true,
      message: "Validation passed",
    },
  };

  it("should include auto-revoke information when autoRevokeDuration is provided", async () => {
    const pendingRequestWithAutoRevoke: PendingRequest = {
      ...basePendingRequest,
      autoRevokeDuration: "P7D", // 7 days
    };

    const mockGetStampHubUser = vi.fn().mockReturnValue(
      ok(
        some({
          userId: "test-user-id",
          userName: "Test User",
          email: "test@example.com",
          groups: [],
        })
      )
    );

    const generateMessageFn = generateMessageFromPendingRequest(logger, mockGetStampHubUser);
    const result = await generateMessageFn(pendingRequestWithAutoRevoke);

    expect(result.isOk()).toBe(true);
    const messagePayload = result._unsafeUnwrap();
    expect(messagePayload).toContain("*Auto-Revoke*");
    expect(messagePayload).toContain("7 days");
    expect(mockGetStampHubUser).toHaveBeenCalledWith("test-user-id");
  });

  it("should not include auto-revoke information when autoRevokeDuration is not provided", async () => {
    const mockGetStampHubUser = vi.fn().mockReturnValue(
      ok(
        some({
          userId: "test-user-id",
          userName: "Test User",
          email: "test@example.com",
          groups: [],
        })
      )
    );

    const generateMessageFn = generateMessageFromPendingRequest(logger, mockGetStampHubUser);
    const result = await generateMessageFn(basePendingRequest);

    expect(result.isOk()).toBe(true);
    const messagePayload = result._unsafeUnwrap();
    expect(messagePayload).not.toContain("*Auto-Revoke*");

    expect(mockGetStampHubUser).toHaveBeenCalledWith("test-user-id");
  });

  it("should include auto-revoke information with complex duration", async () => {
    const pendingRequestWithComplexDuration: PendingRequest = {
      ...basePendingRequest,
      autoRevokeDuration: "P1DT12H", // 1 day and 12 hours
    };

    const mockGetStampHubUser = vi.fn().mockReturnValue(
      ok(
        some({
          userId: "test-user-id",
          userName: "Test User",
          email: "test@example.com",
          groups: [],
        })
      )
    );

    const generateMessageFn = generateMessageFromPendingRequest(logger, mockGetStampHubUser);
    const result = await generateMessageFn(pendingRequestWithComplexDuration);

    expect(result.isOk()).toBe(true);
    const messagePayload = result._unsafeUnwrap();
    expect(messagePayload).toContain("*Auto-Revoke*");
    expect(messagePayload).toContain("1 day and 12 hours");
  });
});
