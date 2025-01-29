import { createLogger } from "@stamp-lib/stamp-logger";
import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { sendChannelMessage, SendChannelMessageError, setChannel, unsetChannel } from "./channel";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN!;
const testChannelId = process.env.SLACK_CHANNEL_ID!;
const logger = createLogger("DEBUG", { moduleName: "slack-notification-plugin-unit-test" });

describe("sendChannelMessage", () => {
  it("should send message to slack channel", async () => {
    const result = await sendChannelMessage({ slackBotToken: SLACK_BOT_TOKEN })({
      input: {
        message: "This is Unit test",
        channelId: testChannelId,
      },
      logger,
    });
    console.log(result);
    expect(result.isOk()).toBe(true);
  });

  it("should return channelNotFound error if slack channel id is invalid", async () => {
    const result = await sendChannelMessage({ slackBotToken: SLACK_BOT_TOKEN })({
      input: {
        message: "This is Unit test",
        channelId: "invalid-channel-id",
      },
      logger,
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().name).toBe("channelNotFound");
  });
});

describe("setChannel", () => {
  it("should set channel", async () => {
    const sendChannelMessage = vi.fn().mockReturnValue(okAsync(undefined));
    const result = await setChannel(
      "DEBUG",
      sendChannelMessage
    )({
      message: "This is CI Test.",
      properties: {
        channelId: testChannelId,
        customMessage: "custom message",
      },
    });
    console.log(result);
    expect(result.isOk()).toBe(true);
    expect(sendChannelMessage).toHaveBeenCalled();
  });

  it("should return invalidChannelConfig error message if properties is invalid", async () => {
    const sendChannelMessage = vi.fn().mockReturnValue(okAsync(undefined));
    const result = await setChannel(
      "DEBUG",
      sendChannelMessage
    )({
      message: "This is CI Test.",
      properties: {
        invalid: "invalid",
      },
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().userMessage).toContain("Invalid channel config property");
  });

  it("should return channelNotFound error message if sendChannelMessage return channelNotFound error", async () => {
    const sendChannelMessage = vi.fn().mockReturnValue(errAsync(new SendChannelMessageError("channelNotFound", "channelNotFound")));
    const result = await setChannel(
      "DEBUG",
      sendChannelMessage
    )({
      message: "This is CI Test.",
      properties: {
        channelId: "invalid-channel-id",
        customMessage: "This is CI Test.",
      },
    });
    expect(result.isOk()).toBe(false);
    expect(result._unsafeUnwrapErr().userMessage).toContain("Channel invalid-channel-id is not found.");
  });

  it("should return notInChannel error message if sendChannelMessage return notInChannel error", async () => {
    const sendChannelMessage = vi.fn().mockReturnValue(errAsync(new SendChannelMessageError("notInChannel", "notInChannel")));
    const result = await setChannel(
      "DEBUG",
      sendChannelMessage
    )({
      message: "This is CI Test.",
      properties: {
        channelId: "invalid-channel-id",
        customMessage: "This is CI Test.",
      },
    });
    expect(result.isOk()).toBe(false);
    expect(result._unsafeUnwrapErr().userMessage).toContain(
      "Stamp app not added to invalid-channel-id channel. Please add stamp app to invalid-channel-id channel."
    );
  });
});

describe("unsetChannel", () => {
  it("should unset channel", async () => {
    const sendChannelMessage = vi.fn().mockReturnValue(okAsync(undefined));
    const result = await unsetChannel(
      "DEBUG",
      sendChannelMessage
    )({
      message: "This is CI Test.",
      id: testChannelId,
    });
    expect(result.isOk()).toBe(true);
    expect(sendChannelMessage).toHaveBeenCalled();
  });

  it("should not error if sendChannelMessage return channelNotFound error", async () => {
    const sendChannelMessage = vi.fn().mockReturnValue(errAsync(new SendChannelMessageError("channelNotFound", "channelNotFound")));
    const result = await unsetChannel(
      "DEBUG",
      sendChannelMessage
    )({
      message: "This is CI Test.",
      id: "invalid-channel-id",
    });
    expect(result.isOk()).toBe(true);
  });

  it("should not error if sendChannelMessage return notInChannel error", async () => {
    const sendChannelMessage = vi.fn().mockReturnValue(errAsync(new SendChannelMessageError("notInChannel", "notInChannel")));
    const result = await unsetChannel(
      "DEBUG",
      sendChannelMessage
    )({
      message: "This is CI Test.",
      id: "invalid-channel-id",
    });
    expect(result.isOk()).toBe(true);
  });
});
