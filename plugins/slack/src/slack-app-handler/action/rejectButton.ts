import { BlockActionLazyHandler, AnyMessageBlock } from "slack-edge";
import { GetAccountLink } from "../../stamp-hub/accountLink";
import { GetRequestInfo } from "../../stamp-hub/approvalRequest";
import { RejectRequest } from "../../stamp-hub/approvalRequest";
import { Logger } from "@stamp-lib/stamp-logger";

export const rejectButtonActionLazyHandler =
  (logger: Logger, getAccountLink: GetAccountLink, getRequestInfo: GetRequestInfo, rejectRequest: RejectRequest): BlockActionLazyHandler<"button"> =>
  async ({ payload, context }) => {
    logger.info("reject_button Lazy action ", JSON.stringify(payload));

    const slackUserId = payload.user.id;
    const slackUserName = payload.user.name;
    const approvalRequestId = payload.actions[0].block_id; // Set reqeustId in src/message/approvalRequest.ts
    const rejectedComment = payload.state?.values.comment?.plain_text_input?.value ?? "";
    const timeStamp = new Date().toISOString();

    if (context.respond) {
      const originalBlocks = (payload.message ? payload.message["blocks"] : []) as AnyMessageBlock[];
      const accountLink = await getAccountLink({ slackUserId });
      if (accountLink.isErr()) {
        originalBlocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `[History] <@${slackUserId}> rejected request but error occurred: ${accountLink.error.userMessage} ${timeStamp}`,
          },
        });
        await context.respond({ text: "The reject request resulted in an error", blocks: originalBlocks });
        return;
      }

      if (accountLink.value.isNone()) {
        originalBlocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `[History] <@${slackUserId}>rejected request but ${slackUserName} is not link Stamp. Please link Stamp and retry. ${timeStamp}`,
          },
        });
        await context.respond({ text: "The reject request resulted in an error", blocks: originalBlocks });
        return;
      }

      const rejectApprovalRequestResult = await rejectRequest({
        userIdWhoRejected: accountLink.value.value.userId,
        rejectComment: rejectedComment,
        approvalRequestId: approvalRequestId,
      });
      if (rejectApprovalRequestResult.isErr()) {
        logger.error(rejectApprovalRequestResult.error);

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
            text: `[History] <@${slackUserId}> rejected request but error occurred: ${rejectApprovalRequestResult.error.userMessage} ${timeStamp}`,
          },
        });
        await context.respond({ text: "The reject request resulted in an error", blocks: responseBlocks });
        return;
      }

      // remove action and input block to prevent further user reactions.
      const blocks = originalBlocks.filter((block) => block.type !== "actions" && block.type !== "input");
      // add comment block
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `[History] <@${slackUserId}> rejected request. Comment: ${rejectedComment} ${timeStamp}`,
        },
      });
      await context.respond({ text: `${slackUserName} rejected request`, blocks });
    }
  };
