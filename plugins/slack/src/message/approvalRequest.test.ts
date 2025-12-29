import { describe, expect, it, vi } from "vitest";
import { notifySlack, buildApprovalRequestBlocks, buildRequesterInputBlocks, notifyApprovalRequest } from "./approvalRequest";
import { InputParamWithName, InputResourceWithName, PendingRequest } from "@stamp-lib/stamp-types/models";

import { createLogger } from "@stamp-lib/stamp-logger";
import { ok } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";

describe("notifySlack", () => {
  const slackBotToken = process.env.SLACK_BOT_TOKEN!;
  const slackChannelId = process.env.SLACK_CHANNEL_ID!;

  it("Success case with valid token and existing channel", async () => {
    const blocks = buildApprovalRequestBlocks({
      customMessage: "Unit Test",
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow",
      requesterName: "Test User",
      validationMessage: "This is a unit test notification, please ignore it.",
      requestComment: "It's a unit test",
      requestId: "1234567890",
      inputParamsWithNames: [],
      inputResourcesWithNames: [],
    });

    const result = await notifySlack(slackBotToken, slackChannelId, blocks);
    expect(result.isOk()).toBe(true);
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

    const blocks = buildApprovalRequestBlocks({
      customMessage: "Unit Test",
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow",
      requesterName: "Test User",
      validationMessage: "This is a unit test notification, please ignore it.",
      requestComment: "It's a unit test",
      requestId: "1234567890",
      inputParamsWithNames,
      inputResourcesWithNames,
    });

    const result = await notifySlack(slackBotToken, slackChannelId, blocks);
    expect(result.isOk()).toBe(true);
  });

  it("Success case with only inputParams", async () => {
    const inputParamsWithNames: InputParamWithName[] = [{ id: "reason", name: "Request Reason", value: "Need access for deployment" }];

    const blocks = buildApprovalRequestBlocks({
      customMessage: "Unit Test",
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow",
      requesterName: "Test User",
      validationMessage: "This is a unit test notification, please ignore it.",
      requestComment: "It's a unit test",
      requestId: "1234567890",
      inputParamsWithNames,
      inputResourcesWithNames: [],
    });

    const result = await notifySlack(slackBotToken, slackChannelId, blocks);
    expect(result.isOk()).toBe(true);
  });

  it("Success case with only inputResources", async () => {
    const inputResourcesWithNames: InputResourceWithName[] = [
      { resourceTypeId: "storage-bucket", resourceTypeName: "Storage Bucket", resourceId: "bucket-789", resourceName: "Data Backup Bucket" },
    ];

    const blocks = buildApprovalRequestBlocks({
      customMessage: "Unit Test",
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow",
      requesterName: "Test User",
      validationMessage: "This is a unit test notification, please ignore it.",
      requestComment: "It's a unit test",
      requestId: "1234567890",
      inputParamsWithNames: [],
      inputResourcesWithNames,
    });

    const result = await notifySlack(slackBotToken, slackChannelId, blocks);
    expect(result.isOk()).toBe(true);
  });

  it("Success case with auto-revoke", async () => {
    const blocks = buildApprovalRequestBlocks({
      customMessage: "Unit Test",
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow",
      requesterName: "Test User",
      validationMessage: "This is a unit test notification, please ignore it.",
      requestComment: "It's a unit test",
      requestId: "1234567890",
      inputParamsWithNames: [],
      inputResourcesWithNames: [],
      autoRevokeDuration: "P7D",
    });

    const result = await notifySlack(slackBotToken, slackChannelId, blocks);
    expect(result.isOk()).toBe(true);
  });

  it("Success case with auto-revoke and max requester input fields", async () => {
    // Test the maximum block payload scenario with all fields
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

    const blocks = buildApprovalRequestBlocks({
      customMessage: "Please review the following approval request and take appropriate action.",
      catalogId: "iam-idc-catalog",
      approvalFlowId: "aws-account-access-approval-flow",
      requesterName: "John Doe",
      validationMessage: "Requesting access to production AWS account for deployment activities.",
      requestComment: "I need access to the production environment to deploy the latest release.",
      requestId: "1234567890",
      inputParamsWithNames,
      inputResourcesWithNames,
      autoRevokeDuration: "P30D",
    });

    const result = await notifySlack(slackBotToken, slackChannelId, blocks);
    expect(result.isOk()).toBe(true);
  });

  it("Failure case with invalid token", async () => {
    const blocks = buildApprovalRequestBlocks({
      customMessage: "Unit Test",
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow",
      requesterName: "Test User",
      validationMessage: "This is a unit test notification, please ignore it.",
      requestComment: "It's a unit test",
      requestId: "1234567890",
      inputParamsWithNames: [],
      inputResourcesWithNames: [],
    });

    const result = await notifySlack("invalid-token", slackChannelId, blocks);
    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error.message.includes("invalid_auth")).toBe(true);
  });

  it("Failure case specifying not exist channel", async () => {
    const blocks = buildApprovalRequestBlocks({
      customMessage: "Unit Test",
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow",
      requesterName: "Test User",
      validationMessage: "This is a unit test notification, please ignore it.",
      requestComment: "It's a unit test",
      requestId: "1234567890",
      inputParamsWithNames: [],
      inputResourcesWithNames: [],
    });

    const result = await notifySlack(slackBotToken, "#not-exist", blocks);
    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error.message.includes("channel_not_found")).toBe(true);
  });
});

describe("buildApprovalRequestBlocks", () => {
  it("should build blocks with all required fields", () => {
    const blocks = buildApprovalRequestBlocks({
      customMessage: "Please review",
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow",
      requesterName: "Test User",
      validationMessage: "Validation passed",
      requestComment: "Test comment",
      requestId: "req-123",
      inputParamsWithNames: [],
      inputResourcesWithNames: [],
    });

    // Should have: header, custom message, catalog, approval flow, requester, message, request comment, input, actions = 9 blocks
    expect(blocks.length).toBe(9);
    expect(blocks[0]).toHaveProperty("type", "header");
    expect(blocks[1]).toHaveProperty("type", "section"); // custom message
    expect(blocks[2]).toHaveProperty("type", "section"); // catalog
    expect(blocks[3]).toHaveProperty("type", "section"); // approval flow
    expect(blocks[4]).toHaveProperty("type", "section"); // requester
    expect(blocks[5]).toHaveProperty("type", "section"); // message
    expect(blocks[6]).toHaveProperty("type", "section"); // request comment
    expect(blocks[7]).toHaveProperty("type", "input");
    expect(blocks[8]).toHaveProperty("type", "actions");
  });

  it("should include auto-revoke block when autoRevokeDuration is provided", () => {
    const blocks = buildApprovalRequestBlocks({
      customMessage: "Please review",
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow",
      requesterName: "Test User",
      validationMessage: "Validation passed",
      requestComment: "Test comment",
      requestId: "req-123",
      inputParamsWithNames: [],
      inputResourcesWithNames: [],
      autoRevokeDuration: "P7D",
    });

    // Should have: header, custom message, catalog, approval flow, requester, message, auto-revoke, request comment, input, actions = 10 blocks
    expect(blocks.length).toBe(10);

    // Check auto-revoke block content (after message block, before request comment)
    const autoRevokeBlock = blocks[6] as { text: { text: string } };
    expect(autoRevokeBlock.text.text).toContain("*Auto-Revoke*");
    expect(autoRevokeBlock.text.text).toContain("7 days");
  });

  it("should include requester input blocks when inputParams and inputResources are provided", () => {
    const inputParamsWithNames: InputParamWithName[] = [{ id: "param1", name: "Environment", value: "production" }];
    const inputResourcesWithNames: InputResourceWithName[] = [
      { resourceTypeId: "account-type", resourceTypeName: "Account", resourceId: "acc-123", resourceName: "Production Account" },
    ];

    const blocks = buildApprovalRequestBlocks({
      customMessage: "Please review",
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow",
      requesterName: "Test User",
      validationMessage: "Validation passed",
      requestComment: "Test comment",
      requestId: "req-123",
      inputParamsWithNames,
      inputResourcesWithNames,
    });

    // Should have: header, custom message, catalog, approval flow, requester, requester input (1 section), message, request comment, input, actions = 10 blocks
    expect(blocks.length).toBe(10);
  });

  it("should format request info blocks correctly", () => {
    const blocks = buildApprovalRequestBlocks({
      customMessage: "Please review",
      catalogId: "my-catalog",
      approvalFlowId: "my-approval-flow",
      requesterName: "John Doe",
      validationMessage: "Request is valid",
      requestComment: "Test comment",
      requestId: "req-123",
      inputParamsWithNames: [],
      inputResourcesWithNames: [],
    });

    const catalogBlock = blocks[2] as { text: { text: string } };
    const approvalFlowBlock = blocks[3] as { text: { text: string } };
    const requesterBlock = blocks[4] as { text: { text: string } };
    const messageBlock = blocks[5] as { text: { text: string } };

    expect(catalogBlock.text.text).toBe("*Catalog*: my-catalog");
    expect(approvalFlowBlock.text.text).toBe("*Approval Flow*: my-approval-flow");
    expect(requesterBlock.text.text).toBe("*Requester*: John Doe");
    expect(messageBlock.text.text).toBe("*Message*: Request is valid");
  });

  it("should format request comment block correctly", () => {
    const blocks = buildApprovalRequestBlocks({
      customMessage: "Please review",
      catalogId: "test-catalog",
      approvalFlowId: "test-approval-flow",
      requesterName: "Test User",
      validationMessage: "Validation passed",
      requestComment: "This is my comment",
      requestId: "req-123",
      inputParamsWithNames: [],
      inputResourcesWithNames: [],
    });

    // Request comment is at index 6 (after message block)
    const requestCommentBlock = blocks[6] as { text: { text: string } };
    expect(requestCommentBlock.text.text).toBe("*Request Comment*\nThis is my comment");
  });
});

describe("notifyApprovalRequest", () => {
  const logger = createLogger("DEBUG", { moduleName: "test" });
  const slackBotToken = process.env.SLACK_BOT_TOKEN!;

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

  it("should send notification successfully with valid inputs", async () => {
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

    const notifyFn = notifyApprovalRequest(logger, slackBotToken, mockGetStampHubUser);
    const result = await notifyFn({
      channelConfigProperties: {
        channelId: process.env.SLACK_CHANNEL_ID!,
        customMessage: "Please review this request",
      },
      request: basePendingRequest,
      inputParamsWithNames: [],
      inputResourcesWithNames: [],
    });

    expect(result.isOk()).toBe(true);
    expect(mockGetStampHubUser).toHaveBeenCalledWith("test-user-id");
  });

  it("should send notification with auto-revoke duration", async () => {
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

    const notifyFn = notifyApprovalRequest(logger, slackBotToken, mockGetStampHubUser);
    const result = await notifyFn({
      channelConfigProperties: {
        channelId: process.env.SLACK_CHANNEL_ID!,
        customMessage: "Please review this request",
      },
      request: { ...basePendingRequest, autoRevokeDuration: "P7D" },
      inputParamsWithNames: [],
      inputResourcesWithNames: [],
    });

    expect(result.isOk()).toBe(true);
  });

  it("should send notification with input params and resources", async () => {
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

    const notifyFn = notifyApprovalRequest(logger, slackBotToken, mockGetStampHubUser);
    const result = await notifyFn({
      channelConfigProperties: {
        channelId: process.env.SLACK_CHANNEL_ID!,
        customMessage: "Please review this request",
      },
      request: basePendingRequest,
      inputParamsWithNames: [{ id: "env", name: "Environment", value: "production" }],
      inputResourcesWithNames: [{ resourceTypeId: "account", resourceTypeName: "Account", resourceId: "acc-123", resourceName: "Prod Account" }],
    });

    expect(result.isOk()).toBe(true);
  });

  it("should return error when user is not found", async () => {
    const mockGetStampHubUser = vi.fn().mockReturnValue(ok(none));

    const notifyFn = notifyApprovalRequest(logger, slackBotToken, mockGetStampHubUser);
    const result = await notifyFn({
      channelConfigProperties: {
        channelId: process.env.SLACK_CHANNEL_ID!,
        customMessage: "Please review this request",
      },
      request: basePendingRequest,
      inputParamsWithNames: [],
      inputResourcesWithNames: [],
    });

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error.message).toBe("user is not found");
  });

  it("should use empty string when customMessage is not provided", async () => {
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

    const notifyFn = notifyApprovalRequest(logger, slackBotToken, mockGetStampHubUser);
    const result = await notifyFn({
      channelConfigProperties: {
        channelId: process.env.SLACK_CHANNEL_ID!,
        customMessage: undefined,
      },
      request: basePendingRequest,
      inputParamsWithNames: [],
      inputResourcesWithNames: [],
    });

    expect(result.isOk()).toBe(true);
  });
});

describe("buildRequesterInputBlocks", () => {
  it("should return empty array when both inputParamsWithNames and inputResourcesWithNames are empty", () => {
    const blocks = buildRequesterInputBlocks([], []);
    expect(blocks).toEqual([]);
  });

  it("should generate section with fields for input parameters only", () => {
    const inputParamsWithNames: InputParamWithName[] = [
      { id: "param1", name: "Parameter 1", value: "value1" },
      { id: "param2", name: "Parameter 2", value: 123 },
    ];
    const blocks = buildRequesterInputBlocks(inputParamsWithNames, []);

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
    const blocks = buildRequesterInputBlocks([], inputResourcesWithNames);

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
    const blocks = buildRequesterInputBlocks(inputParamsWithNames, inputResourcesWithNames);

    // Should have: single section with all fields
    expect(blocks.length).toBe(1);
    expect(blocks[0]).toHaveProperty("type", "section");
    const section = blocks[0] as { fields: Array<{ type: string; text: string }> };
    expect(section.fields.length).toBe(2);
  });

  it("should handle boolean values in input parameters", () => {
    const inputParamsWithNames: InputParamWithName[] = [{ id: "param1", name: "Boolean Param", value: true }];
    const blocks = buildRequesterInputBlocks(inputParamsWithNames, []);

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
    const blocks = buildRequesterInputBlocks(inputParamsWithNames, []);

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
    const blocks = buildRequesterInputBlocks([], inputResourcesWithNames);

    const section = blocks[0] as { fields: Array<{ type: string; text: string }> };
    expect(section.fields[0].text).toBe("*Account:*\nProduction Account (acc-123)");
  });

  it("should display only resource ID when resourceName is undefined", () => {
    const inputResourcesWithNames: InputResourceWithName[] = [{ resourceTypeId: "account-type", resourceTypeName: "Account", resourceId: "acc-123" }];
    const blocks = buildRequesterInputBlocks([], inputResourcesWithNames);

    const section = blocks[0] as { fields: Array<{ type: string; text: string }> };
    expect(section.fields[0].text).toBe("*Account:*\nacc-123");
  });

  it("should create a single section with exactly 10 fields", () => {
    const inputParamsWithNames: InputParamWithName[] = Array.from({ length: 10 }, (_, i) => ({
      id: `param${i}`,
      name: `Parameter ${i}`,
      value: `value${i}`,
    }));
    const blocks = buildRequesterInputBlocks(inputParamsWithNames, []);
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
    const blocks = buildRequesterInputBlocks(inputParamsWithNames, inputResourcesWithNames);
    expect(blocks.length).toBe(3);
    const first = blocks[0] as { fields: Array<{ type: string; text: string }> };
    const second = blocks[1] as { fields: Array<{ type: string; text: string }> };
    const third = blocks[2] as { fields: Array<{ type: string; text: string }> };
    expect(first.fields.length).toBe(10);
    expect(second.fields.length).toBe(10);
    expect(third.fields.length).toBe(1);
  });

  it("should stay within Slack's 50 block limit with auto-revoke and max fields", () => {
    // Fixed blocks used elsewhere in the message:
    // header, custom message, catalog, approval flow, requester, message, auto-revoke, request comment, input, actions = 10 blocks
    const fixedBlocks = 10;
    const maxSections = 50 - fixedBlocks; // 40 sections available for requester input
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

    const requesterBlocks = buildRequesterInputBlocks(inputParamsWithNames, inputResourcesWithNames);
    expect(requesterBlocks.length).toBe(maxSections);

    // Total message blocks must be exactly 50
    const totalBlocks = fixedBlocks + requesterBlocks.length;
    expect(totalBlocks).toBe(50);
  });
});
