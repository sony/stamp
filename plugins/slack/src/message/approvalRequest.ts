import { Logger } from "@stamp-lib/stamp-logger";
import { PendingRequest } from "@stamp-lib/stamp-types/models";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { Result, err, ok } from "neverthrow";
import { ChatPostMessageResponse, SlackAPIClient } from "slack-web-api-client";
import { GetStampHubUser } from "../stamp-hub/stampUser";
import { ChannelConfigProperties } from "../stamp-notification-plugin/channelConfigProperties";
import { formatAutoRevokeDuration } from "./autoRevokeUtils";

export const notifyApprovalRequest =
  (logger: Logger, slackBotToken: string, getStampHubUser: GetStampHubUser) =>
  async (input: { channelConfigProperties: ChannelConfigProperties; request: PendingRequest }): Promise<Result<undefined, NotificationError>> => {
    const { channelConfigProperties, request } = input;

    const slackChannelId = channelConfigProperties.channelId;
    const customMessage = channelConfigProperties.customMessage ?? "";

    const messagePayloadResult = await generateMessageFromPendingRequest(logger, getStampHubUser)(request);
    if (messagePayloadResult.isErr()) {
      logger.error(messagePayloadResult.error);
      return err(messagePayloadResult.error);
    }
    const messagePayload = messagePayloadResult.value;
    const requestComment = `*Request Comment*\n${request.requestComment}`;
    const requestId = request.requestId;

    const response = await notifySlack(slackBotToken, slackChannelId, customMessage, messagePayload, requestComment, requestId);
    logger.info(response);
    return ok(undefined);
  };

export async function notifySlack(
  slackBotToken: string,
  slackChannelId: string,
  customMessage: string,
  messagePayload: string,
  requestComment: string,
  requestId: string
): Promise<ChatPostMessageResponse> {
  const client = new SlackAPIClient(slackBotToken, {
    logLevel: "INFO",
  });
  const response = await client.chat.postMessage({
    channel: slackChannelId,
    text: "Stamp Approval request",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Stamp Approval request",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: customMessage,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: messagePayload,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: requestComment,
        },
      },
      {
        type: "input",
        block_id: "comment",
        element: {
          type: "plain_text_input",
          multiline: true,
          action_id: "plain_text_input",
        },
        label: {
          type: "plain_text",
          text: "Comment",
          emoji: true,
        },
      },
      {
        type: "actions",
        block_id: requestId, // To use this value in action handler
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Approve",
              emoji: true,
            },
            value: "approve",
            action_id: "approve_button",
            style: "primary",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Reject",
              emoji: true,
            },
            value: "reject",
            action_id: "reject_button",
            style: "danger",
          },
        ],
      },
    ],
  });
  return response;
}

export const generateMessageFromPendingRequest = (logger: Logger, getStampHubUser: GetStampHubUser) => async (pendingRequest: PendingRequest) => {
  const user = await getStampHubUser(pendingRequest.requestUserId);
  if (user.isErr()) {
    logger.error(user.error);
    return err(user.error);
  }
  if (user.value.isNone()) {
    logger.error("user is not found");
    return err(new NotificationError("user is not found"));
  }
  const userName = user.value.value.userName;

  let messagePayload = `*Catalog*: ${pendingRequest.catalogId}\n*Approval Flow*: ${pendingRequest.approvalFlowId}\n*Requester*: ${userName}\n*Message*: ${pendingRequest.validationHandlerResult.message}`;

  // Add auto-revoke information if available
  if (pendingRequest.autoRevokeDuration) {
    const duration = formatAutoRevokeDuration(pendingRequest.autoRevokeDuration);
    if (duration) {
      messagePayload += `\n*Auto-Revoke*: This approval will be automatically revoked in ${duration}`;
    }
  }

  return ok(messagePayload);
};
