import { describe, expect, it } from "vitest";
import { notifySlack } from "./approvalRequest";

describe("notifySlack", () => {
  const slackBotToken = process.env.SLACK_BOT_TOKEN!;
  const slackChannelId = process.env.SLACK_CHANNEL_ID!;
  const customMessage = `Unit Test`;
  const messagePayload = `*Message:* This is a unit test notification, please ignore it.`;
  const requestComment = `*Request Comment*\nIt's a unit test`;
  const requestId = "1234567890";

  it("Success case with valid token and existing channel", async () => {
    if (!slackBotToken || !slackChannelId) {
      console.log("Skipping Slack API test - environment variables not set");
      return;
    }
    const response = await notifySlack(slackBotToken, slackChannelId, customMessage, messagePayload, requestComment, requestId);
    expect(response.ok).toBe(true);
  });

  it("Failure case with invalid token", async () => {
    if (!slackChannelId) {
      console.log("Skipping Slack API test - environment variables not set");
      return;
    }
    const errorSlackBotToken = "invalid-token";
    try {
      await notifySlack(errorSlackBotToken, slackChannelId, customMessage, messagePayload, requestComment, requestId);
    } catch (error) {
      // An error occurred with the content: Failed to call chat.postMessage due to invalid_auth
      expect((error as Error).message.includes("invalid_auth")).toBe(true);
    }
  });

  it("Failure case specifying not exist channel", async () => {
    if (!slackBotToken) {
      console.log("Skipping Slack API test - environment variables not set");
      return;
    }
    const errorSlackChannelId = "#not-exist";
    try {
      await notifySlack(slackBotToken, errorSlackChannelId, customMessage, messagePayload, requestComment, requestId);
    } catch (error) {
      // An error occurred with the content: Failed to call chat.postMessage due to channel_not_found
      expect((error as Error).message.includes("channel_not_found")).toBe(true);
    }
  });
});
