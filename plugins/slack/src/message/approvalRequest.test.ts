import { describe, expect, it, vi } from "vitest";
import { notifySlack, generateMessageFromPendingRequest, generateRequesterInputBlocks } from "./approvalRequest";
import { PendingRequest } from "@stamp-lib/stamp-types/models";
import { InputParamWithName, InputResourceWithName } from "@stamp-lib/stamp-types/pluginInterface/notification";
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
  const emptyRequesterInputBlocks: Parameters<typeof notifySlack>[6] = [];

  it("Success case with valid token and existing channel", async () => {
    const response = await notifySlack(slackBotToken, slackChannelId, customMessage, messagePayload, requestComment, requestId, emptyRequesterInputBlocks);
    expect(response.ok).toBe(true);
  });

  it("Success case with requester input blocks (inputParams and inputResources)", async () => {
    const inputParamsWithNames: InputParamWithName[] = [
      { id: "param1", name: "Environment", value: "production" },
      { id: "param2", name: "Duration (hours)", value: 24 },
      { id: "param3", name: "Requires MFA", value: true },
    ];
    const inputResourcesWithNames: InputResourceWithName[] = [
      { resourceTypeId: "account-type", resourceTypeName: "Account", resourceId: "acc-123", resourceName: "Production Account" },
      { resourceTypeId: "role-type", resourceTypeName: "Role", resourceId: "role-456", resourceName: "Admin Role" },
    ];
    const requesterInputBlocks = generateRequesterInputBlocks(inputParamsWithNames, inputResourcesWithNames);

    const response = await notifySlack(slackBotToken, slackChannelId, customMessage, messagePayload, requestComment, requestId, requesterInputBlocks);
    expect(response.ok).toBe(true);
  });

  it("Success case with only inputParams", async () => {
    const inputParamsWithNames: InputParamWithName[] = [{ id: "reason", name: "Request Reason", value: "Need access for deployment" }];
    const requesterInputBlocks = generateRequesterInputBlocks(inputParamsWithNames, []);

    const response = await notifySlack(slackBotToken, slackChannelId, customMessage, messagePayload, requestComment, requestId, requesterInputBlocks);
    expect(response.ok).toBe(true);
  });

  it("Success case with only inputResources", async () => {
    const inputResourcesWithNames: InputResourceWithName[] = [
      { resourceTypeId: "storage-bucket", resourceTypeName: "Storage Bucket", resourceId: "bucket-789", resourceName: "Data Backup Bucket" },
    ];
    const requesterInputBlocks = generateRequesterInputBlocks([], inputResourcesWithNames);

    const response = await notifySlack(slackBotToken, slackChannelId, customMessage, messagePayload, requestComment, requestId, requesterInputBlocks);
    expect(response.ok).toBe(true);
  });

  it("Success case with auto-revoke as separate section", async () => {
    const autoRevokeMessage = `*Auto-Revoke*: This approval will be automatically revoked in 7 days`;
    const response = await notifySlack(
      slackBotToken,
      slackChannelId,
      customMessage,
      messagePayload,
      requestComment,
      requestId,
      emptyRequesterInputBlocks,
      autoRevokeMessage
    );
    expect(response.ok).toBe(true);
  });

  it("Success case with auto-revoke and max requester input fields", async () => {
    // Test the maximum realistic scenario: auto-revoke + many input params and resources
    const autoRevokeMessage = `*Auto-Revoke*: This approval will be automatically revoked in 30 days`;

    // Create 10 input params and 10 input resources (20 fields total = 2 sections)
    const inputParamsWithNames: InputParamWithName[] = Array.from({ length: 10 }, (_, i) => ({
      id: `param${i}`,
      name: `Parameter ${i}`,
      value: `value${i}`,
    }));
    const inputResourcesWithNames: InputResourceWithName[] = Array.from({ length: 10 }, (_, i) => ({
      resourceTypeId: `type${i}`,
      resourceTypeName: `Resource Type ${i}`,
      resourceId: `res-${i}`,
      resourceName: `Resource ${i}`,
    }));
    const requesterInputBlocks = generateRequesterInputBlocks(inputParamsWithNames, inputResourcesWithNames);

    const response = await notifySlack(
      slackBotToken,
      slackChannelId,
      customMessage,
      messagePayload,
      requestComment,
      requestId,
      requesterInputBlocks,
      autoRevokeMessage
    );
    expect(response.ok).toBe(true);
  });

  it("Failure case with invalid token", async () => {
    const errorSlackBotToken = "invalid-token";
    try {
      await notifySlack(errorSlackBotToken, slackChannelId, customMessage, messagePayload, requestComment, requestId, emptyRequesterInputBlocks);
    } catch (error) {
      // An error occurred with the content: Failed to call chat.postMessage due to invalid_auth
      expect((error as Error).message.includes("invalid_auth")).toBe(true);
    }
  });

  it("Failure case specifying not exist channel", async () => {
    const errorSlackChannelId = "#not-exist";
    try {
      await notifySlack(slackBotToken, errorSlackChannelId, customMessage, messagePayload, requestComment, requestId, emptyRequesterInputBlocks);
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
    const { messagePayload, autoRevokeMessage } = result._unsafeUnwrap();
    expect(messagePayload).toContain("*Catalog*");
    expect(autoRevokeMessage).toBeDefined();
    expect(autoRevokeMessage).toContain("*Auto-Revoke*");
    expect(autoRevokeMessage).toContain("7 days");
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
    const { messagePayload, autoRevokeMessage } = result._unsafeUnwrap();
    expect(messagePayload).not.toContain("*Auto-Revoke*");
    expect(autoRevokeMessage).toBeUndefined();

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
    const { autoRevokeMessage } = result._unsafeUnwrap();
    expect(autoRevokeMessage).toBeDefined();
    expect(autoRevokeMessage).toContain("*Auto-Revoke*");
    expect(autoRevokeMessage).toContain("1 day and 12 hours");
  });
});

describe("generateRequesterInputBlocks", () => {
  it("should return empty array when both inputParamsWithNames and inputResourcesWithNames are empty", () => {
    const blocks = generateRequesterInputBlocks([], []);
    expect(blocks).toEqual([]);
  });

  it("should generate section with fields for input parameters only", () => {
    const inputParamsWithNames: InputParamWithName[] = [
      { id: "param1", name: "Parameter 1", value: "value1" },
      { id: "param2", name: "Parameter 2", value: 123 },
    ];
    const blocks = generateRequesterInputBlocks(inputParamsWithNames, []);

    // Should have: section with fields
    expect(blocks.length).toBe(1);
    expect(blocks[0]).toHaveProperty("type", "section");
    expect(blocks[0]).toHaveProperty("fields");
    const section = blocks[0] as { fields: Array<{ type: string; text: string }> };
    expect(section.fields.length).toBe(2);
    expect(section.fields[0].text).toBe("*Parameter 1:*\nvalue1");
    expect(section.fields[1].text).toBe("*Parameter 2:*\n123");
  });

  it("should generate section with fields for input resources only", () => {
    const inputResourcesWithNames: InputResourceWithName[] = [
      { resourceTypeId: "rt1", resourceTypeName: "Resource Type 1", resourceId: "res1", resourceName: "Resource 1" },
    ];
    const blocks = generateRequesterInputBlocks([], inputResourcesWithNames);

    // Should have: section with fields
    expect(blocks.length).toBe(1);
    expect(blocks[0]).toHaveProperty("type", "section");
    expect(blocks[0]).toHaveProperty("fields");
    const section = blocks[0] as { fields: Array<{ type: string; text: string }> };
    expect(section.fields[0].text).toBe("*Resource Type 1:*\nResource 1 (res1)");
  });

  it("should generate single section with fields for both input parameters and input resources", () => {
    const inputParamsWithNames: InputParamWithName[] = [{ id: "param1", name: "Parameter 1", value: "value1" }];
    const inputResourcesWithNames: InputResourceWithName[] = [
      { resourceTypeId: "rt1", resourceTypeName: "Resource Type 1", resourceId: "res1", resourceName: "Resource 1" },
    ];
    const blocks = generateRequesterInputBlocks(inputParamsWithNames, inputResourcesWithNames);

    // Should have: single section with all fields
    expect(blocks.length).toBe(1);
    expect(blocks[0]).toHaveProperty("type", "section");
    const section = blocks[0] as { fields: Array<{ type: string; text: string }> };
    expect(section.fields.length).toBe(2);
  });

  it("should handle boolean values in input parameters", () => {
    const inputParamsWithNames: InputParamWithName[] = [{ id: "param1", name: "Boolean Param", value: true }];
    const blocks = generateRequesterInputBlocks(inputParamsWithNames, []);

    expect(blocks.length).toBe(1);
    const section = blocks[0] as { fields: Array<{ type: string; text: string }> };
    expect(section.fields[0].text).toBe("*Boolean Param:*\ntrue");
  });

  it("should split into multiple sections when exceeding max fields (10)", () => {
    // Create 12 input parameters to exceed the 10 per section limit
    const inputParamsWithNames: InputParamWithName[] = Array.from({ length: 12 }, (_, i) => ({
      id: `param${i}`,
      name: `Parameter ${i}`,
      value: `value${i}`,
    }));
    const blocks = generateRequesterInputBlocks(inputParamsWithNames, []);

    // Should have: 2 sections (10 fields + 2 fields)
    expect(blocks.length).toBe(2);
    const firstSection = blocks[0] as { fields: Array<{ type: string; text: string }> };
    const secondSection = blocks[1] as { fields: Array<{ type: string; text: string }> };
    expect(firstSection.fields.length).toBe(10);
    expect(secondSection.fields.length).toBe(2);
  });

  it("should display resource name with ID in field format", () => {
    const inputResourcesWithNames: InputResourceWithName[] = [
      { resourceTypeId: "account-type", resourceTypeName: "Account", resourceId: "acc-123", resourceName: "Production Account" },
    ];
    const blocks = generateRequesterInputBlocks([], inputResourcesWithNames);

    const section = blocks[0] as { fields: Array<{ type: string; text: string }> };
    expect(section.fields[0].text).toBe("*Account:*\nProduction Account (acc-123)");
  });

  it("should create a single section with exactly 10 fields", () => {
    const inputParamsWithNames: InputParamWithName[] = Array.from({ length: 10 }, (_, i) => ({
      id: `param${i}`,
      name: `Parameter ${i}`,
      value: `value${i}`,
    }));
    const blocks = generateRequesterInputBlocks(inputParamsWithNames, []);
    expect(blocks.length).toBe(1);
    const section = blocks[0] as { fields: Array<{ type: string; text: string }> };
    expect(section.fields.length).toBe(10);
  });

  it("should split into three sections when fields exceed 20 (e.g., 21)", () => {
    const inputParamsWithNames: InputParamWithName[] = Array.from({ length: 15 }, (_, i) => ({
      id: `param${i}`,
      name: `Parameter ${i}`,
      value: `value${i}`,
    }));
    const inputResourcesWithNames: InputResourceWithName[] = Array.from({ length: 6 }, (_, i) => ({
      resourceTypeId: `type${i}`,
      resourceTypeName: `Type ${i}`,
      resourceId: `res${i}`,
      resourceName: `Resource ${i}`,
    }));
    const blocks = generateRequesterInputBlocks(inputParamsWithNames, inputResourcesWithNames);
    expect(blocks.length).toBe(3);
    const first = blocks[0] as { fields: Array<{ type: string; text: string }> };
    const second = blocks[1] as { fields: Array<{ type: string; text: string }> };
    const third = blocks[2] as { fields: Array<{ type: string; text: string }> };
    expect(first.fields.length).toBe(10);
    expect(second.fields.length).toBe(10);
    expect(third.fields.length).toBe(1);
  });

  it("should stay within Slack's 50 block limit with auto-revoke and max fields", () => {
    // Fixed blocks used elsewhere in the message: header, custom message, message payload, request comment, input, actions
    const fixedBlocks = 6;
    const maxSections = 50 - fixedBlocks; // 44 sections available for requester input
    const maxFields = maxSections * 10; // 10 fields per section

    // Split evenly between params and resources
    const half = Math.floor(maxFields / 2);
    const inputParamsWithNames: InputParamWithName[] = Array.from({ length: half }, (_, i) => ({
      id: `param${i}`,
      name: `Param ${i}`,
      value: `value${i}`,
    }));
    const inputResourcesWithNames: InputResourceWithName[] = Array.from({ length: maxFields - half }, (_, i) => ({
      resourceTypeId: `type${i}`,
      resourceTypeName: `Type ${i}`,
      resourceId: `res${i}`,
      resourceName: `Resource ${i}`,
    }));

    const requesterBlocks = generateRequesterInputBlocks(inputParamsWithNames, inputResourcesWithNames);
    expect(requesterBlocks.length).toBe(maxSections);

    // Total message blocks must be exactly 50
    const totalBlocks = fixedBlocks + requesterBlocks.length;
    expect(totalBlocks).toBe(50);
  });
});
