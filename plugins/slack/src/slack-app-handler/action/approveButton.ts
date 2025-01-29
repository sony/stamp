import { BlockActionLazyHandler, AnyMessageBlock } from "slack-edge";
import { GetAccountLink } from "../../stamp-hub/accountLink";
import { GetRequestInfo } from "../../stamp-hub/approvalRequest";
import { ApproveRequest } from "../../stamp-hub/approvalRequest";
import { Logger } from "@stamp-lib/stamp-logger";

export const approveButtonActionLazyHandler =
  (logger: Logger, getAccountLink: GetAccountLink, getRequestInfo: GetRequestInfo, approveRequest: ApproveRequest): BlockActionLazyHandler<"button"> =>
  async ({ payload, context }) => {
    logger.info("approve_button Lazy action ", JSON.stringify(payload));
    const slackUserId = payload.user.id;
    const slackUserName = payload.user.name;
    const approvalRequestId = payload.actions[0].block_id; // Set reqeustId in src/message/approvalRequest.ts
    const approvedComment = payload.state?.values.comment?.plain_text_input?.value ?? "";
    const timeStamp = new Date().toISOString();
    if (context.respond) {
      const originalBlocks = (payload.message ? payload.message["blocks"] : []) as AnyMessageBlock[];
      const accountLink = await getAccountLink({ slackUserId });
      if (accountLink.isErr()) {
        originalBlocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `[History] <@${slackUserId}> approved request but error occurred: ${accountLink.error.userMessage} ${timeStamp}`,
          },
        });
        await context.respond({ text: "The approve request resulted in an error", blocks: originalBlocks });
        return;
      }

      if (accountLink.value.isNone()) {
        originalBlocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `[History] <@${slackUserId}> approved request but ${slackUserName} is not link Stamp. Please link Stamp and retry. ${timeStamp}`,
          },
        });
        await context.respond({ text: "The approve request resulted in an error", blocks: originalBlocks });
        return;
      }

      const approveApprovalRequestResult = await approveRequest({
        userIdWhoApproved: accountLink.value.value.userId,
        approvedComment: approvedComment,
        approvalRequestId: approvalRequestId,
      });
      if (approveApprovalRequestResult.isErr()) {
        logger.error(approveApprovalRequestResult.error);

        const requestInfo = await getRequestInfo({
          approvalRequestId: approvalRequestId,
          requestUserId: accountLink.value.value.userId,
        });
        if (requestInfo.isErr()) {
          originalBlocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `[History] <@${slackUserId}> approved request but error occurred: ${requestInfo.error.userMessage} ${timeStamp}`,
            },
          });
          await context.respond({ text: "The approve request resulted in an error", blocks: originalBlocks });
          return;
        }

        let isAlreadyPerformed = false;
        if (requestInfo.isOk() && requestInfo.value.isSome()) {
          isAlreadyPerformed = requestInfo.value.value.status !== "pending";
        }

        let responseBlocks = originalBlocks;
        if (isAlreadyPerformed) {
          responseBlocks = originalBlocks.filter((block) => block.type !== "actions" && block.type !== "input");
        }

        responseBlocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `[History] <@${slackUserId}> approved request but error occurred: ${approveApprovalRequestResult.error.userMessage} ${timeStamp}`,
          },
        });
        await context.respond({ text: "The approve request resulted in an error", blocks: responseBlocks });
        return;
      }

      // remove action and input block to prevent further user reactions.
      const blocks = originalBlocks.filter((block) => block.type !== "actions" && block.type !== "input");
      // add comment block
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `[History] <@${slackUserId}> approved. Comment: ${approvedComment} ${timeStamp}`,
        },
      });
      // context.respond sends a message using response_url
      await context.respond({ text: `${slackUserName} approved request.`, blocks: blocks });
    }
  };
