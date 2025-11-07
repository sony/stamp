import {
  ApprovalRequestEventMessage,
  GroupMemberAddedEventMessage,
  NotificationError,
  NotificationProvider,
  ResourceAuditMessage,
} from "@stamp-lib/stamp-types/pluginInterface/notification";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { StampHubRouterClient } from "@stamp-lib/stamp-hub";

import { createLogger, Logger, LogLevel } from "@stamp-lib/stamp-logger";
import { ChannelConfigProperties } from "./channelConfigProperties";

import { AnyMessageBlock, ContextBlock, HeaderBlock, RichTextSection, SectionBlock, SlackAPIClient } from "slack-web-api-client";
import { notifyApprovalRequest } from "../message/approvalRequest";
import { getStampHubUser } from "../stamp-hub/stampUser";

const BLOCK_MAX_NUM = 50; // Slack Block Kit has a limit of 50 blocks per message

export const sendNotification =
  ({
    logLevel,
    sendResourceAudit,
    sendGroupMemberAddedEvent,
    sendApprovalRequestNotification,
  }: {
    logLevel: LogLevel;
    sendResourceAudit: SendResourceAudit;
    sendGroupMemberAddedEvent: SendGroupMemberAddedEvent;
    sendApprovalRequestNotification: SendApprovalRequestNotification;
  }): NotificationProvider["sendNotification"] =>
  (input) => {
    const logger = createLogger(logLevel, { moduleName: "slack-notification-plugin" });
    logger.info("Send notification", { input });
    const channelConfigProperties = ChannelConfigProperties.safeParse(input.channel.properties);
    if (!channelConfigProperties.success) {
      logger.info("Invalid channel config property", { input });
      const message = `Invalid channel config property: ${channelConfigProperties.error.errors}`;
      return errAsync(new NotificationError(message, message));
    }

    switch (input.message.type) {
      case "GroupMemberAddedEvent":
        return sendGroupMemberAddedEvent({ input: { channelConfigProperties: channelConfigProperties.data, message: input.message }, logger }).map(
          () => void 0
        );
      case "ResourceAudit":
        return sendResourceAudit({ input: { channelConfigProperties: channelConfigProperties.data, message: input.message }, logger }).map(() => void 0);
      case "ApprovalRequestEvent":
        return sendApprovalRequestNotification({
          input: { channelConfigProperties: channelConfigProperties.data, message: input.message },
          logger,
        });
      default:
        logger.error("Invalid message type", { input });
        return errAsync(new NotificationError(`Message type is invalid`));
    }
  };

type SendGroupMemberAddedEvent = (property: {
  input: { channelConfigProperties: ChannelConfigProperties; message: GroupMemberAddedEventMessage };
  logger: Logger;
}) => ResultAsync<void, NotificationError>;

export const sendGroupMemberAddedEvent =
  ({ slackBotToken }: { slackBotToken: string }): SendGroupMemberAddedEvent =>
  ({ input, logger }): ResultAsync<void, NotificationError> => {
    const client = new SlackAPIClient(slackBotToken, {
      logLevel: "INFO",
    });

    return ResultAsync.fromPromise(
      client.chat.postMessage({
        channel: input.channelConfigProperties.channelId,
        text: "User is added to group",
        blocks: getGroupMemberAddedEventBlocks(input.channelConfigProperties, input.message),
      }),
      (err) => {
        logger.error(err);
        return new NotificationError((err as Error).message ?? "Internal Server Error");
      }
    ).map(() => void 0);
  };

type SendResourceAudit = (property: {
  input: { channelConfigProperties: ChannelConfigProperties; message: ResourceAuditMessage };
  logger: Logger;
}) => ResultAsync<void, NotificationError>;

export const sendResourceAudit =
  ({ slackBotToken }: { slackBotToken: string }): SendResourceAudit =>
  ({ input, logger }): ResultAsync<void, NotificationError> => {
    const client = new SlackAPIClient(slackBotToken, {
      logLevel: "INFO",
    });
    const auditItemMessages: Array<AnyMessageBlock> = input.message.property.ResourceAuditItem.map((item) => {
      const auditValueMessages: Array<RichTextSection> = item.values.map((value) => {
        return {
          type: "rich_text_section",
          elements: [
            {
              type: "text",
              text: value,
            },
          ],
        };
      });

      const message: AnyMessageBlock = {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              {
                type: "text",
                text: item.name,
              },
            ],
          },
          {
            type: "rich_text_list",
            style: "bullet",
            elements: auditValueMessages,
          },
        ],
      };
      return message;
    });

    return ResultAsync.fromPromise(
      client.chat.postMessage({
        channel: input.channelConfigProperties.channelId,
        text: "Stamp resource audit notification",
        blocks: getResourceAuditBlocks(input.channelConfigProperties, input.message, auditItemMessages),
      }),
      (err) => {
        logger.error(err);
        return new NotificationError((err as Error).message ?? "Internal Server Error");
      }
    ).map(() => void 0);
  };

function getHeaderBlock(text: string): HeaderBlock {
  const headerBlock: HeaderBlock = {
    type: "header",
    text: {
      type: "plain_text",
      text: text,
      emoji: true,
    },
  };
  return headerBlock;
}

function getSectionBlock(text: string): SectionBlock {
  const sectionBlock: SectionBlock = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: text,
    },
  };
  return sectionBlock;
}

function getContextBlock(text: string): ContextBlock {
  const contextBlock: ContextBlock = {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: text,
      },
    ],
  };
  return contextBlock;
}

function getGroupMemberAddedEventBlocks(channelConfigProperties: ChannelConfigProperties, message: GroupMemberAddedEventMessage): Array<AnyMessageBlock> {
  // If undefined or empty, an error will occur, set space.
  const customMessage = channelConfigProperties.customMessage ? channelConfigProperties.customMessage : " ";
  const blocks = [
    getHeaderBlock("A user has been added to the group"),
    getSectionBlock(customMessage),
    getSectionBlock(`Target Group: ${message.property.groupName} (ID: ${message.property.groupId})`),
    getSectionBlock(`Requester: ${message.property.requesterUserName}`),
    getSectionBlock(`Added User: ${message.property.addedUserName}`),
    getSectionBlock(`User Added At: ${message.property.timeStamp}`),
  ];

  return blocks;
}

function getResourceAuditBlocks(
  channelConfigProperties: ChannelConfigProperties,
  message: ResourceAuditMessage,
  auditItemMessages: Array<AnyMessageBlock>
): Array<AnyMessageBlock> {
  // If undefined or empty, an error will occur, set space.
  const customMessage = channelConfigProperties.customMessage ? channelConfigProperties.customMessage : " ";
  let blocks = [
    getHeaderBlock("Stamp resource audit notification"),
    getSectionBlock(customMessage),
    getSectionBlock(`Catalog Name : ${message.property.catalogName}`),
    getSectionBlock(`Resource Type Name : ${message.property.resourceTypeName}`),
    getSectionBlock(`Resource Name : ${message.property.resourceName}`),
    ...auditItemMessages,
  ];

  // If the total number of blocks is more than 50, the excess will be deleted and a comment will be added.
  if (blocks.length > BLOCK_MAX_NUM) {
    blocks = blocks.slice(0, BLOCK_MAX_NUM - 1);
    blocks.push(getContextBlock("and more..."));
  }

  return blocks;
}

type SendApprovalRequestNotification = (property: {
  input: { channelConfigProperties: ChannelConfigProperties; message: ApprovalRequestEventMessage };
  logger: Logger;
}) => ResultAsync<void, NotificationError>;

export const sendApprovalRequestNotification =
  ({
    slackBotToken,
    getStampHubUserClient,
  }: {
    slackBotToken: string;
    getStampHubUserClient: StampHubRouterClient["systemRequest"]["user"]["get"];
  }): SendApprovalRequestNotification =>
  ({ input, logger }): ResultAsync<void, NotificationError> => {
    const { channelConfigProperties, message } = input;
    logger.info("approvalRequestHandler", message);

    if (message.property.request.approverType !== "group") {
      return okAsync(undefined);
    }

    return new ResultAsync(
      notifyApprovalRequest(
        logger,
        slackBotToken,
        getStampHubUser(logger, getStampHubUserClient)
      )({ channelConfigProperties, request: message.property.request })
    );
  };
