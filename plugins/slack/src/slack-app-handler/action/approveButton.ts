import { BlockActionLazyHandler, AnyMessageBlock } from "slack-edge";
import { GetAccountLink } from "../../stamp-hub/accountLink";
import { GetRequestInfo } from "../../stamp-hub/approvalRequest";
import { ApproveRequest } from "../../stamp-hub/approvalRequest";
import { Logger } from "@stamp-lib/stamp-logger";
import { calculateAutoRevokeDate } from "../../message/autoRevokeUtils";

/**
 * Build a history message for approval action
 */
const buildHistoryMessage = (slackUserId: string, approvedComment: string, timeStamp: string): string => {
  return `[History] <@${slackUserId}> approved. Comment: ${approvedComment} ${timeStamp}`;
};

/**
 * Build an error history message
 */
const buildErrorHistoryMessage = (slackUserId: string, errorMessage: string, timeStamp: string): string => {
  return `[History] <@${slackUserId}> approved request but error occurred: ${errorMessage} ${timeStamp}`;
};

/**
 * Build an account not linked error message
 */
const buildAccountNotLinkedMessage = (slackUserId: string, slackUserName: string, timeStamp: string): string => {
  return `[History] <@${slackUserId}> approved request but ${slackUserName} is not linked to Stamp. Please link Stamp and retry. ${timeStamp}`;
};

/**
 * Create a section block with markdown text
 */
const createSectionBlock = (text: string): AnyMessageBlock => ({
  type: "section",
  text: {
    type: "mrkdwn",
    text,
  },
});

/**
 * Remove action and input blocks from message blocks
 */
const removeInteractiveBlocks = (blocks: AnyMessageBlock[]): AnyMessageBlock[] => {
  return blocks.filter((block) => block.type !== "actions" && block.type !== "input");
};

/**
 * Update Auto-Revoke information in message blocks
 */
const updateAutoRevokeInfo = (blocks: AnyMessageBlock[], autoRevokeDuration: string): AnyMessageBlock[] => {
  const autoRevokeDate = calculateAutoRevokeDate(autoRevokeDuration);
  if (!autoRevokeDate) {
    return blocks;
  }

  return blocks.map((block) => {
    if (block.type === "section" && block.text?.type === "mrkdwn" && block.text.text?.includes("*Auto-Revoke*:")) {
      const updatedText = block.text.text.replace(/\*Auto-Revoke\*:.*$/, `*Auto-Revoke*: This approval will be automatically revoked on ${autoRevokeDate}`);
      return {
        ...block,
        text: {
          ...block.text,
          text: updatedText,
        },
      };
    }
    return block;
  });
};

/**
 * Build response blocks for successful approval
 */
const buildSuccessResponseBlocks = (
  originalBlocks: AnyMessageBlock[],
  autoRevokeDuration: string | undefined,
  slackUserId: string,
  approvedComment: string,
  timeStamp: string
): AnyMessageBlock[] => {
  let blocks = removeInteractiveBlocks(originalBlocks);

  if (autoRevokeDuration) {
    blocks = updateAutoRevokeInfo(blocks, autoRevokeDuration);
  }

  const approvalMessage = buildHistoryMessage(slackUserId, approvedComment, timeStamp);
  blocks.push(createSectionBlock(approvalMessage));

  return blocks;
};

/**
 * Build response blocks for approval error
 */
const buildErrorResponseBlocks = (
  originalBlocks: AnyMessageBlock[],
  isAlreadyPerformed: boolean,
  slackUserId: string,
  errorMessage: string,
  timeStamp: string
): AnyMessageBlock[] => {
  let blocks = originalBlocks;
  if (isAlreadyPerformed) {
    blocks = removeInteractiveBlocks(originalBlocks);
  }

  const historyMessage = buildErrorHistoryMessage(slackUserId, errorMessage, timeStamp);
  blocks.push(createSectionBlock(historyMessage));

  return blocks;
};

type ApprovalData = {
  slackUserId: string;
  slackUserName: string;
  approvalRequestId: string;
  approvedComment: string;
  timeStamp: string;
  originalBlocks: AnyMessageBlock[];
};

type PayloadWithMessage = {
  user: {
    id: string;
    name: string;
  };
  actions: Array<{ block_id: string }>;
  state?: {
    values: {
      comment?: {
        plain_text_input?: {
          value?: string;
        };
      };
    };
  };
  message?: {
    blocks?: AnyMessageBlock[];
  };
};

/**
 * Extract approval data from payload
 */
const extractApprovalData = (payload: PayloadWithMessage): ApprovalData => {
  const slackUserId = payload.user.id;
  const slackUserName = payload.user.name;
  const approvalRequestId = payload.actions[0].block_id;
  const approvedComment = payload.state?.values.comment?.plain_text_input?.value ?? "";
  const timeStamp = new Date().toISOString();
  const originalBlocks = (payload.message ? payload.message["blocks"] : []) as AnyMessageBlock[];

  return {
    slackUserId,
    slackUserName,
    approvalRequestId,
    approvedComment,
    timeStamp,
    originalBlocks,
  };
};

type AccountLinkValidationResult = { type: "success"; userId: string } | { type: "error"; errorMessage: string } | { type: "not_linked" };

/**
 * Validate account link for the user
 */
const validateAccountLink = async (getAccountLink: GetAccountLink, slackUserId: string): Promise<AccountLinkValidationResult> => {
  const accountLink = await getAccountLink({ slackUserId });

  if (accountLink.isErr()) {
    return { type: "error", errorMessage: accountLink.error.userMessage ?? "Unknown error occurred" };
  }

  if (accountLink.value.isNone()) {
    return { type: "not_linked" };
  }

  return { type: "success", userId: accountLink.value.value.userId };
};

type ApprovalExecutionResult =
  | { type: "success"; autoRevokeDuration: string | undefined }
  | { type: "error"; errorMessage: string; isAlreadyPerformed: boolean };

/**
 * Execute approval request
 */
const executeApproval = async (
  approveRequest: ApproveRequest,
  getRequestInfo: GetRequestInfo,
  logger: Logger,
  userId: string,
  approvalRequestId: string,
  approvedComment: string
): Promise<ApprovalExecutionResult> => {
  const approveResult = await approveRequest({
    userIdWhoApproved: userId,
    approvedComment,
    approvalRequestId,
  });

  if (approveResult.isErr()) {
    logger.error(approveResult.error);

    const requestInfo = await getRequestInfo({
      approvalRequestId,
      requestUserId: userId,
    });

    if (requestInfo.isErr()) {
      return {
        type: "error",
        errorMessage: requestInfo.error.userMessage ?? "Unknown error occurred",
        isAlreadyPerformed: false,
      };
    }

    const isAlreadyPerformed = requestInfo.isOk() && requestInfo.value.isSome() && requestInfo.value.value.status !== "pending";

    return {
      type: "error",
      errorMessage: approveResult.error.userMessage ?? "Unknown error occurred",
      isAlreadyPerformed,
    };
  }

  return {
    type: "success",
    autoRevokeDuration: approveResult.value.autoRevokeDuration,
  };
};

type RespondContext = {
  respond?: (params: { text: string; blocks: AnyMessageBlock[] }) => Promise<unknown>;
};

/**
 * Send error response to Slack
 */
const sendErrorResponse = async (context: RespondContext, blocks: AnyMessageBlock[]): Promise<void> => {
  if (context.respond) {
    await context.respond({ text: "The approve request resulted in an error", blocks });
  }
};

/**
 * Send success response to Slack
 */
const sendSuccessResponse = async (context: RespondContext, slackUserName: string, blocks: AnyMessageBlock[]): Promise<void> => {
  if (context.respond) {
    await context.respond({ text: `${slackUserName} approved request.`, blocks });
  }
};

export const approveButtonActionLazyHandler =
  (logger: Logger, getAccountLink: GetAccountLink, getRequestInfo: GetRequestInfo, approveRequest: ApproveRequest): BlockActionLazyHandler<"button"> =>
  async ({ payload, context }) => {
    logger.info("approve_button Lazy action ", JSON.stringify(payload));

    if (!context.respond) {
      return;
    }

    const approvalData = extractApprovalData(payload);
    const { slackUserId, slackUserName, approvalRequestId, approvedComment, timeStamp, originalBlocks } = approvalData;

    // Validate account link
    const accountLinkValidation = await validateAccountLink(getAccountLink, slackUserId);

    if (accountLinkValidation.type === "error") {
      const errorMessage = buildErrorHistoryMessage(slackUserId, accountLinkValidation.errorMessage, timeStamp);
      const blocks = [...originalBlocks, createSectionBlock(errorMessage)];
      await sendErrorResponse(context, blocks);
      return;
    }

    if (accountLinkValidation.type === "not_linked") {
      const errorMessage = buildAccountNotLinkedMessage(slackUserId, slackUserName, timeStamp);
      const blocks = [...originalBlocks, createSectionBlock(errorMessage)];
      await sendErrorResponse(context, blocks);
      return;
    }

    // Execute approval
    const approvalResult = await executeApproval(approveRequest, getRequestInfo, logger, accountLinkValidation.userId, approvalRequestId, approvedComment);

    if (approvalResult.type === "error") {
      const blocks = buildErrorResponseBlocks(originalBlocks, approvalResult.isAlreadyPerformed, slackUserId, approvalResult.errorMessage, timeStamp);
      await sendErrorResponse(context, blocks);
      return;
    }

    // Build and send success response
    const blocks = buildSuccessResponseBlocks(originalBlocks, approvalResult.autoRevokeDuration, slackUserId, approvedComment, timeStamp);
    await sendSuccessResponse(context, slackUserName, blocks);
  };
