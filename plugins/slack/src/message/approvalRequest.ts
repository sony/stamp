import { Logger } from "@stamp-lib/stamp-logger";
import { PendingRequest } from "@stamp-lib/stamp-types/models";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { Result, err, ok } from "neverthrow";
import { ChatPostMessageResponse, SlackAPIClient } from "slack-web-api-client";
import { GetStampHubUser } from "../stamp-hub/stampUser";
import { ChannelConfigProperties } from "../stamp-notification-plugin/channelConfigProperties";

// Parse ISO 8601 duration format (e.g., "P7D" for 7 days, "PT12H" for 12 hours, "P1DT2H" for 1 day 2 hours)
const parseAutoRevokeDuration = (duration: string): { days: number; hours: number } | null => {
  const durationMatch = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/);
  if (durationMatch) {
    const days = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
    const hours = durationMatch[2] ? parseInt(durationMatch[2]) : 0;
    return { days, hours };
  }
  return null;
};

// Calculate when access would be revoked if approved now
const calculateAutoRevokeDate = (autoRevokeDuration: string): string | null => {
  const parsed = parseAutoRevokeDuration(autoRevokeDuration);
  if (!parsed) {
    return null;
  }

  const { days, hours } = parsed;
  const revokeTime = new Date();
  revokeTime.setDate(revokeTime.getDate() + days);
  revokeTime.setHours(revokeTime.getHours() + hours);

  // Format the date for display in Slack (include timezone for clarity)
  return revokeTime.toLocaleString("en-US", { 
    timeZoneName: "short",
    year: "numeric",
    month: "2-digit", 
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

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

const generateMessageFromPendingRequest = (logger: Logger, getStampHubUser: GetStampHubUser) => async (pendingRequest: PendingRequest) => {
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
    const autoRevokeDate = calculateAutoRevokeDate(pendingRequest.autoRevokeDuration);
    if (autoRevokeDate) {
      messagePayload += `\n*Auto Revoke Date*: ${autoRevokeDate}`;
    }
  }

  return ok(messagePayload);
};
