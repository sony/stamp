import { Logger } from "@stamp-lib/stamp-logger";
import { PendingRequest } from "@stamp-lib/stamp-types/models";
import { InputParamWithName, InputResourceWithName, NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { Result, err, ok } from "neverthrow";
import { AnyMessageBlock, ChatPostMessageResponse, SlackAPIClient } from "slack-web-api-client";
import { GetStampHubUser } from "../stamp-hub/stampUser";
import { ChannelConfigProperties } from "../stamp-notification-plugin/channelConfigProperties";
import { formatAutoRevokeDuration } from "./autoRevokeUtils";

/**
 * Input for notifyApprovalRequest function
 */
export type NotifyApprovalRequestInput = {
  channelConfigProperties: ChannelConfigProperties;
  request: PendingRequest;
  inputParamsWithNames: InputParamWithName[];
  inputResourcesWithNames: InputResourceWithName[];
};

export const notifyApprovalRequest =
  (logger: Logger, slackBotToken: string, getStampHubUser: GetStampHubUser) =>
  async (input: NotifyApprovalRequestInput): Promise<Result<undefined, NotificationError>> => {
    const { channelConfigProperties, request, inputParamsWithNames, inputResourcesWithNames } = input;

    const slackChannelId = channelConfigProperties.channelId;
    const customMessage = channelConfigProperties.customMessage ?? "";

    const messagePayloadResult = await generateMessageFromPendingRequest(logger, getStampHubUser)(request);
    if (messagePayloadResult.isErr()) {
      logger.error(messagePayloadResult.error);
      return err(messagePayloadResult.error);
    }
    const { messagePayload, autoRevokeMessage } = messagePayloadResult.value;
    const requestComment = `*Request Comment*\n${request.requestComment}`;
    const requestId = request.requestId;

    // Generate requester input blocks
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
    logger.info(response);
    return ok(undefined);
  };

export async function notifySlack(
  slackBotToken: string,
  slackChannelId: string,
  customMessage: string,
  messagePayload: string,
  requestComment: string,
  requestId: string,
  requesterInputBlocks: AnyMessageBlock[],
  autoRevokeMessage?: string
): Promise<ChatPostMessageResponse> {
  const client = new SlackAPIClient(slackBotToken, {
    logLevel: "INFO",
  });

  // Build blocks array
  const blocks: AnyMessageBlock[] = [
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
  ];

  // Add auto-revoke as a separate section for visual separation
  if (autoRevokeMessage) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: autoRevokeMessage,
      },
    });
  }

  // Include requester input blocks (may be empty if no input)
  blocks.push(...requesterInputBlocks);

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: requestComment,
    },
  });

  blocks.push({
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
  });

  blocks.push({
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
  });

  const response = await client.chat.postMessage({
    channel: slackChannelId,
    text: "Stamp Approval request",
    blocks: blocks,
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

  const messagePayload = `*Catalog*: ${pendingRequest.catalogId}\n*Approval Flow*: ${pendingRequest.approvalFlowId}\n*Requester*: ${userName}\n*Message*: ${pendingRequest.validationHandlerResult.message}`;

  // Generate auto-revoke message if available (will be displayed in a separate section)
  let autoRevokeMessage: string | undefined;
  if (pendingRequest.autoRevokeDuration) {
    const duration = formatAutoRevokeDuration(pendingRequest.autoRevokeDuration);
    if (duration) {
      autoRevokeMessage = `*Auto-Revoke*: This approval will be automatically revoked in ${duration}`;
    }
  }

  return ok({ messagePayload, autoRevokeMessage });
};

/**
 * Generates Slack Block Kit blocks for displaying requester input data.
 * Uses Slack's field layout for a clean 2-column display.
 *
 * @param inputParamsWithNames - Array of input parameters with display names
 * @param inputResourcesWithNames - Array of input resources with display names
 * @returns Array of Slack blocks for the requester input section
 */
export function generateRequesterInputBlocks(inputParamsWithNames: InputParamWithName[], inputResourcesWithNames: InputResourceWithName[]): AnyMessageBlock[] {
  // If both are empty, return empty array (no blocks to display)
  if (inputParamsWithNames.length === 0 && inputResourcesWithNames.length === 0) {
    return [];
  }

  const blocks: AnyMessageBlock[] = [];

  // Collect all fields for a unified section layout
  const fields: Array<{ type: "mrkdwn"; text: string }> = [];

  // Add input parameters
  if (inputParamsWithNames.length > 0) {
    for (const param of inputParamsWithNames) {
      fields.push({
        type: "mrkdwn",
        text: `*${param.name}:*\n${String(param.value)}`,
      });
    }
  }

  // Add input resources with ID information
  if (inputResourcesWithNames.length > 0) {
    for (const resource of inputResourcesWithNames) {
      fields.push({
        type: "mrkdwn",
        text: `*${resource.resourceTypeName}:*\n${resource.resourceName} (${resource.resourceId})`,
      });
    }
  }

  // Slack allows max 10 fields per section, so split if needed
  const MAX_FIELDS_PER_SECTION = 10;
  for (let i = 0; i < fields.length; i += MAX_FIELDS_PER_SECTION) {
    const chunk = fields.slice(i, i + MAX_FIELDS_PER_SECTION);
    blocks.push({
      type: "section",
      fields: chunk,
    });
  }

  return blocks;
}
