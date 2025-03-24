import { createLogger } from "@stamp-lib/stamp-logger";
import { ResourceAuditItem } from "@stamp-lib/stamp-types/models";
import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { sendGroupMemberAddedEvent, sendNotification, sendResourceAudit } from "./notification";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN!;
const testChannelId = process.env.SLACK_CHANNEL_ID!;
const logger = createLogger("DEBUG", { moduleName: "slack-notification-plugin-unit-test" });
const SlackTestChannelId = testChannelId;

function getResourceAuditItem(length: number): ResourceAuditItem[] {
  const result: ResourceAuditItem[] = [];
  for (let i = 1; i <= length; i++) {
    result.push({
      values: [`test${i}`],
      type: "permission",
      name: `test${i}`,
    });
  }
  return result;
}

describe("sendNotification", () => {
  it("should route to sendResourceAudit", async () => {
    const sendResourceAudit = vi.fn().mockReturnValue(okAsync(undefined));
    const sendGroupMemberAddedEvent = vi.fn().mockReturnValue(okAsync(undefined));
    const sendApprovalRequestNotification = vi.fn().mockReturnValue(okAsync(undefined));
    const result = await sendNotification({
      logLevel: "DEBUG",
      sendResourceAudit: sendResourceAudit,
      sendGroupMemberAddedEvent: sendGroupMemberAddedEvent,
      sendApprovalRequestNotification: sendApprovalRequestNotification,
    })({
      message: {
        type: "ResourceAudit",
        property: {
          catalogId: "test",
          resourceTypeId: "test",
          resourceId: "test",
          catalogName: "test",
          resourceTypeName: "test",
          resourceName: "test",
          ResourceAuditItem: getResourceAuditItem(1),
        },
      },
      channel: {
        properties: {
          channelId: "test-channel-id",
          customMessage: "This is CI Test.",
        },
        id: "test-channel-id",
        typeId: "slack",
      },
    });

    expect(result.isOk()).toBe(true);
    expect(sendResourceAudit).toHaveBeenCalled();
    expect(sendGroupMemberAddedEvent).not.toHaveBeenCalled();
  });

  it("should route to sendGroupMemberAddedEvent", async () => {
    const sendResourceAudit = vi.fn().mockReturnValue(okAsync(undefined));
    const sendGroupMemberAddedEvent = vi.fn().mockReturnValue(okAsync(undefined));
    const sendApprovalRequestNotification = vi.fn().mockReturnValue(okAsync(undefined));
    const result = await sendNotification({
      logLevel: "DEBUG",
      sendResourceAudit: sendResourceAudit,
      sendGroupMemberAddedEvent: sendGroupMemberAddedEvent,
      sendApprovalRequestNotification: sendApprovalRequestNotification,
    })({
      message: {
        type: "GroupMemberAddedEvent",
        property: {
          groupId: "test",
          groupName: "test",
          addedUserId: "test",
          addedUserName: "test",
          timeStamp: "test",
          requesterUserId: "test",
          requesterUserName: "test",
        },
      },
      channel: {
        properties: {
          channelId: "test-channel-id",
          customMessage: "This is CI Test.",
        },
        id: "test-channel-id",
        typeId: "slack",
      },
    });

    expect(result.isOk()).toBe(true);
    expect(sendGroupMemberAddedEvent).toHaveBeenCalled();
    expect(sendResourceAudit).not.toHaveBeenCalled();
  });
});

describe("sendResourceAudit", () => {
  it("should send resource audit notification(Block count is within 50)", async () => {
    const result = await sendResourceAudit({
      slackBotToken: SLACK_BOT_TOKEN,
    })({
      input: {
        message: {
          type: "ResourceAudit",
          property: {
            catalogId: "test",
            resourceTypeId: "test",
            resourceId: "test",
            catalogName: "test",
            resourceTypeName: "test",
            resourceName: "test",
            ResourceAuditItem: getResourceAuditItem(1),
          },
        },
        channelConfigProperties: {
          channelId: SlackTestChannelId,
          customMessage: "This is CI Test.",
        },
      },
      logger: logger,
    });
    expect(result.isOk()).toBe(true);
  });

  it("should send resource audit notification(Block count is above 50)", async () => {
    const result = await sendResourceAudit({
      slackBotToken: SLACK_BOT_TOKEN,
    })({
      input: {
        message: {
          type: "ResourceAudit",
          property: {
            catalogId: "test",
            resourceTypeId: "test",
            resourceId: "test",
            catalogName: "test",
            resourceTypeName: "test",
            resourceName: "test",
            ResourceAuditItem: getResourceAuditItem(50),
          },
        },
        channelConfigProperties: {
          channelId: SlackTestChannelId,
          customMessage: "This is CI Test.",
        },
      },
      logger: logger,
    });
    expect(result.isOk()).toBe(true);
  });

  it("should send group member notification", async () => {
    const result = await sendGroupMemberAddedEvent({
      slackBotToken: SLACK_BOT_TOKEN,
    })({
      input: {
        message: {
          type: "GroupMemberAddedEvent",
          property: {
            groupId: "test",
            groupName: "test",
            addedUserId: "test",
            addedUserName: "test",
            timeStamp: "test",
            requesterUserId: "test",
            requesterUserName: "test",
          },
        },
        channelConfigProperties: {
          channelId: SlackTestChannelId,
          customMessage: "This is CI Test.",
        },
      },
      logger: logger,
    });
    expect(result.isOk()).toBe(true);
  });
});
