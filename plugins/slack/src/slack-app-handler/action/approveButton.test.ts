import { describe, it, expect, vi } from "vitest";
import { SlackAPIClient } from "slack-web-api-client";
import { createLogger } from "@stamp-lib/stamp-logger";
import { okAsync } from "neverthrow";
import { some } from "@stamp-lib/stamp-option";
import { AnyMessageBlock, SectionBlock } from "slack-edge";
import { approveButtonActionLazyHandler } from "./approveButton";

const token = process.env.SLACK_BOT_TOKEN;
const testToken = process.env.SLACK_TEST_BOT_TOKEN;
const channelId = process.env.SLACK_CHANNEL_ID;

const isSectionBlock = (block: AnyMessageBlock): block is SectionBlock => block.type === "section";

const postInitialSlackMessage = async (
  webClient: SlackAPIClient,
  testWebClient: SlackAPIClient,
  channelId: string,
  requestId: string
): Promise<{ postedMessageTs: string; originalBlocks: AnyMessageBlock[] }> => {
  const initialBlocks: AnyMessageBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Approval Request*\n*Request ID*: ${requestId}\n*Auto-Revoke*: This approval will be automatically revoked in 1 hour.`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Approve",
          },
          value: requestId,
          action_id: "approve_button",
          style: "primary",
        },
      ],
    },
  ];

  const postResponse = await webClient.chat.postMessage({
    channel: channelId,
    text: "Approval request (integration test)",
    blocks: initialBlocks,
  });

  if (!postResponse.ok || !postResponse.ts) {
    throw new Error("Failed to post initial Slack message for integration test");
  }

  const postedMessageTs = postResponse.ts;

  const historyResponse = await testWebClient.conversations.history({
    channel: channelId,
    latest: postedMessageTs,
    inclusive: true,
    limit: 1,
  });

  const message = historyResponse.messages?.[0];
  if (!message || !message.blocks) {
    throw new Error("Failed to fetch initial message blocks for integration test");
  }

  const originalBlocks = message.blocks as unknown as AnyMessageBlock[];

  return { postedMessageTs, originalBlocks };
};

describe("approveButtonActionLazyHandler integration", () => {
  if (!token || !testToken || !channelId) {
    it.skip("requires SLACK_BOT_TOKEN, SLACK_TEST_BOT_TOKEN, and SLACK_CHANNEL_ID", () => {
      expect(true).toBe(true);
    });
    return;
  }

  const slackToken = token;
  const slackTestToken = testToken;
  const slackChannelId = channelId;
  const slackApproverId = "test_user";

  it("updates Slack message when approval succeeds", async () => {
    const webClient = new SlackAPIClient(slackToken);
    const testWebClient = new SlackAPIClient(slackTestToken);
    const logger = createLogger("DEBUG", { moduleName: "slack-approve-button-test" });
    const requestId = `integration-test-${Date.now()}`;
    const approvedComment = "Approved via integration test";

    const { postedMessageTs, originalBlocks } = await postInitialSlackMessage(webClient, testWebClient, slackChannelId, requestId);
    const getAccountLink = vi.fn().mockReturnValue(
      okAsync(
        some({
          accountProviderName: "slack",
          accountId: slackApproverId,
          userId: "stamp-user-id",
          createdAt: new Date().toISOString(),
        })
      )
    );

    const getRequestInfo = vi.fn();

    const approveRequest = vi.fn().mockReturnValue(
      okAsync({
        autoRevokeDuration: "PT1H",
      })
    );

    const handler = approveButtonActionLazyHandler(logger, getAccountLink, getRequestInfo, approveRequest);

    const payload = {
      user: {
        id: slackApproverId,
        name: "Integration Tester",
      },
      actions: [
        {
          block_id: requestId,
        },
      ],
      state: {
        values: {
          comment: {
            plain_text_input: {
              value: approvedComment,
            },
          },
        },
      },
      message: {
        blocks: originalBlocks,
      },
    };

    const context = {
      respond: async ({ text, blocks }: { text: string; blocks: AnyMessageBlock[] }) => {
        await webClient.chat.update({
          channel: slackChannelId,
          ts: postedMessageTs,
          text,
          blocks,
        });
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload/context typing is intentionally relaxed for integration coverage
    await handler({ payload, context } as any);

    const updatedHistory = await testWebClient.conversations.history({
      channel: slackChannelId,
      latest: postedMessageTs,
      inclusive: true,
      limit: 1,
    });

    const updatedMessage = updatedHistory.messages?.[0];
    expect(updatedMessage).toBeDefined();

    const updatedBlocks = updatedMessage?.blocks as unknown as AnyMessageBlock[];
    expect(updatedBlocks.some((block) => block.type === "actions")).toBe(false);

    const sectionBlocks = updatedBlocks.filter(isSectionBlock);

    const autoRevokeBlock = sectionBlocks.find((block) => block.text?.text?.includes("*Auto-Revoke*:"));
    expect(autoRevokeBlock).toBeDefined();
    expect(autoRevokeBlock?.text?.text).toMatch(/automatically revoked on/);

    const historyBlock = sectionBlocks.find((block) => block.text?.text?.includes("[History]"));
    expect(historyBlock).toBeDefined();
    expect(historyBlock?.text?.text).toContain(approvedComment);
    expect(updatedMessage?.text).toContain("Integration Tester approved request.");

    expect(getAccountLink).toHaveBeenCalledWith({ slackUserId: slackApproverId });
    expect(approveRequest).toHaveBeenCalledWith({
      userIdWhoApproved: "stamp-user-id",
      approvedComment,
      approvalRequestId: requestId,
    });
  }, 30_000);
});
