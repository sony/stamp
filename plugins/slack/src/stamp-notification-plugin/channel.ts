import { createLogger, Logger, LogLevel } from "@stamp-lib/stamp-logger";
import { NotificationChannel } from "@stamp-lib/stamp-types/models";
import { NotificationError, NotificationProvider } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { SlackAPIClient, SlackAPIError } from "slack-web-api-client";
import { ChannelConfigProperties } from "./channelConfigProperties";

export const setChannel =
  (logLevel: LogLevel, sendChannelMessage: SendChannelMessage): NotificationProvider["setChannel"] =>
  (input) => {
    const logger = createLogger(logLevel, { moduleName: "slack-notification-plugin" });
    logger.info("Set channel", { input });
    const channelConfig = ChannelConfigProperties.safeParse(input.properties);
    if (!channelConfig.success) {
      logger.info("Invalid channel config property", { input });
      const message = `Invalid channel config property: ${channelConfig.error.errors}`;
      return errAsync(new NotificationError(message, message));
    }

    const customMessage = channelConfig.data.customMessage ?? ""; // May be undefined
    // Send confirm message to notify notification is set.
    const confirmMessage = `${input.message}\n Custom message: ${customMessage}`;
    return sendChannelMessage({ input: { message: confirmMessage, channelId: channelConfig.data.channelId }, logger })
      .map(() => {
        const notificationChannel: NotificationChannel = {
          id: channelConfig.data.channelId,
          properties: { customMessage: customMessage, channelId: channelConfig.data.channelId },
          typeId: "slack",
        };
        return notificationChannel;
      })
      .mapErr((err) => {
        if (err.name === "channelNotFound") {
          const errorMessage = `Channel ${channelConfig.data.channelId} is not found.`;
          return new NotificationError(errorMessage, errorMessage);
        } else if (err.name === "notInChannel") {
          const userMessage = `Stamp app not added to ${channelConfig.data.channelId} channel. Please add stamp app to ${channelConfig.data.channelId} channel.`;
          return new NotificationError(userMessage, userMessage);
        } else {
          logger.error(err);
          return new NotificationError("Internal Server Error", "Internal Server Error");
        }
      });
  };

export const unsetChannel =
  (logLevel: LogLevel, sendChannelMessage: SendChannelMessage): NotificationProvider["unsetChannel"] =>
  (input) => {
    const logger = createLogger(logLevel, { moduleName: "slack-notification-plugin" });
    logger.info("Unset channel", { input });

    const unsetChannelMessage = input.message;

    return sendChannelMessage({ input: { message: unsetChannelMessage, channelId: input.id }, logger }).orElse((err) => {
      if (err.name === "channelNotFound" || err.name === "notInChannel") {
        // Because the channel is maybe already deleted or stamp app deleted, we can ignore this error.
        return okAsync(undefined);
      } else {
        logger.error(err);
        return errAsync(new NotificationError("Internal Server Error", "Internal Server Error"));
      }
    });
  };

export type SendChannelMessageErrorName = "channelNotFound" | "notInChannel" | "InternalServerError";
export class SendChannelMessageError extends Error {
  constructor(public readonly name: SendChannelMessageErrorName, message: string) {
    super(message);
  }
}
type SendChannelMessage = (property: { input: { message: string; channelId: string }; logger: Logger }) => ResultAsync<void, SendChannelMessageError>;

export const sendChannelMessage =
  ({ slackBotToken }: { slackBotToken: string }): SendChannelMessage =>
  ({ input, logger }): ResultAsync<void, SendChannelMessageError> => {
    const client = new SlackAPIClient(slackBotToken, {
      logLevel: "INFO",
    });

    return ResultAsync.fromPromise(
      client.chat.postMessage({
        channel: input.channelId,
        text: input.message,
        mrkdwn: true,
      }),
      (err) => {
        if ((err as SlackAPIError)?.result?.error === "channel_not_found") {
          return new SendChannelMessageError("channelNotFound", `Channel ${input.channelId} is not found.`);
        } else if ((err as SlackAPIError)?.result?.error === "not_in_channel") {
          return new SendChannelMessageError(
            "notInChannel",
            `Stamp app not added to ${input.channelId} channel. Please add stamp app to ${input.channelId} channel.`
          );
        } else {
          logger.error(err);
          return new SendChannelMessageError("InternalServerError", (err as Error).message ?? "Internal Server Error");
        }
      }
    ).map(() => void 0);
  };
