import { Logger } from "@stamp-lib/stamp-logger";
import { InputParamWithName, InputResourceWithName, PendingRequest } from "@stamp-lib/stamp-types/models";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { Result, err, ok } from "neverthrow";
import { AnyMessageBlock, SlackAPIClient, SlackAPIError } from "slack-web-api-client";
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

/**
 * Input for buildApprovalRequestBlocks function
 */
export type BuildApprovalRequestBlocksInput = {
  customMessage?: string;
  catalogId: string;
  approvalFlowId: string;
  requesterName: string;
  validationMessage: string;
  requestComment: string;
  requestId: string;
  inputParamsWithNames: InputParamWithName[];
  inputResourcesWithNames: InputResourceWithName[];
  autoRevokeDuration?: string;
};

export const notifyApprovalRequest =
  (logger: Logger, slackBotToken: string, getStampHubUser: GetStampHubUser) =>
  async (input: NotifyApprovalRequestInput): Promise<Result<undefined, NotificationError>> => {
    const { channelConfigProperties, request, inputParamsWithNames, inputResourcesWithNames } = input;

    const slackChannelId = channelConfigProperties.channelId;
    const customMessage = channelConfigProperties.customMessage ?? "";

    // Resolve requester name
    const userResult = await getStampHubUser(request.requestUserId);
    if (userResult.isErr()) {
      logger.error(userResult.error);
      return err(userResult.error);
    }
    if (userResult.value.isNone()) {
      logger.error("user is not found");
      return err(new NotificationError("user is not found"));
    }
    const requesterName = userResult.value.value.userName;

    // Build blocks
    const blocks = buildApprovalRequestBlocks({
      customMessage,
      catalogId: request.catalogId,
      approvalFlowId: request.approvalFlowId,
      requesterName,
      validationMessage: request.validationHandlerResult.message,
      requestComment: request.requestComment,
      requestId: request.requestId,
      inputParamsWithNames,
      inputResourcesWithNames,
      autoRevokeDuration: request.autoRevokeDuration,
    });

    const slackResult = await notifySlack(slackBotToken, slackChannelId, blocks);

    if (slackResult.isErr()) {
      logger.error("Failed to send Slack notification", { error: slackResult.error });
      return err(slackResult.error);
    }

    logger.info("Slack notification sent successfully", { response: slackResult.value });
    return ok(undefined);
  };

/**
 * Sends a notification message to Slack.
 * Returns a Result type to handle errors explicitly instead of throwing exceptions.
 */
export async function notifySlack(slackBotToken: string, slackChannelId: string, blocks: AnyMessageBlock[]): Promise<Result<void, NotificationError>> {
  const client = new SlackAPIClient(slackBotToken, {
    logLevel: "INFO",
  });

  try {
    await client.chat.postMessage({
      channel: slackChannelId,
      text: "Stamp Approval request",
      blocks: blocks,
    });
    return ok(undefined);
  } catch (error) {
    // SlackAPIError contains the error code in result.error (e.g., "invalid_auth", "channel_not_found")
    const slackError = error as SlackAPIError;
    const errorCode = slackError?.result?.error;

    // Build error message with cause chain for better debugging (e.g., SSL certificate errors)
    let message: string;
    if (errorCode) {
      message = errorCode;
    } else if (error instanceof Error) {
      // Include cause if available (e.g., "fetch failed" -> "self-signed certificate in certificate chain")
      const causeMessage = error.cause instanceof Error ? `: ${error.cause.message}` : "";
      message = `${error.message}${causeMessage}`;
    } else {
      message = "Failed to send Slack message";
    }
    return err(new NotificationError(message));
  }
}

/**
 * Builds all Slack message blocks for an approval request.
 *
 * The function assembles a complete Slack message for approvers, including:
 * - A header indicating an approval request.
 * - An optional custom message from the requester (only if non-empty).
 * - Catalog, approval flow, and requester information.
 * - The requested parameters and resources.
 * - Any validation message associated with the request.
 * - An optional auto-revoke notice if a duration is provided.
 * - The requester's comment, a comment input hint, and action buttons.
 *
 * Empty or missing `customMessage` values are skipped and do not produce a block
 * in the returned array.
 *
 * @param input - Structured data used to build the approval request blocks:
 *   - `customMessage`: Additional free-text message from the requester. If this is
 *     an empty string or undefined, no custom message block is added.
 *   - `catalogId`: Identifier of the catalog to which the request belongs.
 *   - `approvalFlowId`: Identifier of the approval flow handling this request.
 *   - `requesterName`: Human-readable name of the user who created the request.
 *   - `validationMessage`: Text describing validation results or constraints for the request.
 *   - `requestComment`: Comment provided by the requester explaining the context of the request.
 *   - `requestId`: Unique identifier of the pending request, used by action buttons.
 *   - `inputParamsWithNames`: List of input parameters (with resolved display names) included in the request.
 *   - `inputResourcesWithNames`: List of input resources (with resolved display names) included in the request.
 *   - `autoRevokeDuration`: Optional human-readable duration after which the granted access will be revoked.
 *
 * @returns An ordered array of Slack blocks representing the approval request message.
 */
export function buildApprovalRequestBlocks(input: BuildApprovalRequestBlocksInput): AnyMessageBlock[] {
  const blocks: AnyMessageBlock[] = [];

  blocks.push(buildHeaderBlock());

  // Only add custom message block if it has content
  if (input.customMessage) {
    blocks.push(buildCustomMessageBlock(input.customMessage));
  }

  blocks.push(...buildRequestInfoBlocks(input.catalogId, input.approvalFlowId, input.requesterName));
  blocks.push(...buildRequesterInputBlocks(input.inputParamsWithNames, input.inputResourcesWithNames));
  blocks.push(buildValidationMessageBlock(input.validationMessage));

  const autoRevokeBlock = buildAutoRevokeBlock(input.autoRevokeDuration);
  if (autoRevokeBlock) {
    blocks.push(autoRevokeBlock);
  }

  blocks.push(buildRequestCommentBlock(input.requestComment));
  blocks.push(buildCommentInputBlock());
  blocks.push(buildActionButtonsBlock(input.requestId));

  return blocks;
}

/**
 * Builds the header block for the approval request.
 */
function buildHeaderBlock(): AnyMessageBlock {
  return {
    type: "header",
    text: {
      type: "plain_text",
      text: "Stamp Approval request",
      emoji: true,
    },
  };
}

/**
 * Builds the custom message block.
 */
function buildCustomMessageBlock(customMessage: string): AnyMessageBlock {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: customMessage,
    },
  };
}

/**
 * Builds the request info blocks with Catalog, Approval Flow, and Requester as separate sections.
 */
function buildRequestInfoBlocks(catalogId: string, approvalFlowId: string, requesterName: string): AnyMessageBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Catalog*: ${catalogId}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Approval Flow*: ${approvalFlowId}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Requester*: ${requesterName}`,
      },
    },
  ];
}

/**
 * Builds the validation message block.
 */
function buildValidationMessageBlock(validationMessage: string): AnyMessageBlock {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Message*: ${validationMessage}`,
    },
  };
}

/**
 * Builds the auto-revoke block if duration is provided.
 */
function buildAutoRevokeBlock(autoRevokeDuration?: string): AnyMessageBlock | undefined {
  if (!autoRevokeDuration) {
    return undefined;
  }
  const duration = formatAutoRevokeDuration(autoRevokeDuration);
  if (!duration) {
    return undefined;
  }
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Auto-Revoke*: This approval will be automatically revoked in ${duration}`,
    },
  };
}

/**
 * Builds the request comment block.
 */
function buildRequestCommentBlock(requestComment: string): AnyMessageBlock {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Request Comment*\n${requestComment}`,
    },
  };
}

/**
 * Builds the comment input block for approver feedback.
 */
function buildCommentInputBlock(): AnyMessageBlock {
  return {
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
  };
}

/**
 * Builds the action buttons block with Approve and Reject buttons.
 */
function buildActionButtonsBlock(requestId: string): AnyMessageBlock {
  return {
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
  };
}

/**
 * Generates Slack Block Kit blocks for displaying requester input data.
 * Uses Slack's field layout for a clean 2-column display.
 *
 * @param inputParamsWithNames - Array of input parameters with display names
 * @param inputResourcesWithNames - Array of input resources with display names
 * @returns Array of Slack blocks for the requester input section
 */
export function buildRequesterInputBlocks(inputParamsWithNames: InputParamWithName[], inputResourcesWithNames: InputResourceWithName[]): AnyMessageBlock[] {
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
      // Display resourceName with ID if available, otherwise just ID
      const resourceDisplay = resource.resourceName ? `${resource.resourceName} (${resource.resourceId})` : resource.resourceId;
      fields.push({
        type: "mrkdwn",
        text: `*${resource.resourceTypeName}:*\n${resourceDisplay}`,
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
