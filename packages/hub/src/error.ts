import { Logger } from "@stamp-lib/stamp-logger";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ConfigError } from "@stamp-lib/stamp-types/configInterface";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { IdentityPluginError } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { TRPCError } from "@trpc/server";

// ErrorCode is defined to make it easier to return an appropriate HTTP status code.
// Referring to TRPC Error Code https://trpc.io/docs/server/error-handling#error-codes
export type StampHubErrorCode = "BAD_REQUEST" | "INTERNAL_SERVER_ERROR" | "CONFLICT" | "NOT_FOUND" | "FORBIDDEN";

export class StampHubError extends Error {
  constructor(public systemMessage: string, public userMessage: string, public code: StampHubErrorCode) {
    super(systemMessage);
  }
}

export function convertStampHubError(
  error: Error | DBError | ConfigError | IdentityPluginError | StampHubError | HandlerError | SchedulerError,
  logger?: Logger
): StampHubError {
  if (error instanceof StampHubError) {
    return error;
  } else {
    if (error instanceof ConfigError || error instanceof IdentityPluginError || error instanceof SchedulerError) {
      const message = error.userMessage ?? "Unexpected error occurred";
      logger?.error(message);
      return new StampHubError(message, message, "INTERNAL_SERVER_ERROR");
    } else if (error instanceof DBError) {
      const userMessage = error.userMessage ?? "Unexpected error occurred";
      logger?.error(error.message, userMessage);
      return new StampHubError(error.message, userMessage, "INTERNAL_SERVER_ERROR");
    } else if (error instanceof HandlerError) {
      const userMessage = error.userMessage ?? "Unexpected error occurred";
      logger?.error(error.message, userMessage);
      // systemMessage is not exposed to the user
      return new StampHubError(error.message, userMessage, error.code);
    } else {
      const message = error.message ?? "Unexpected error occurred";
      logger?.error(message);
      return new StampHubError(message, "Unexpected error occurred", "INTERNAL_SERVER_ERROR");
    }
  }
}

export const convertTRPCError =
  (logger: Logger) =>
  (error: Error | DBError | ConfigError | IdentityPluginError | StampHubError): TRPCError => {
    logger.error("convertTRPCError", error);
    if (error instanceof TRPCError) {
      return error;
    } else {
      if (error instanceof DBError || error instanceof ConfigError || error instanceof IdentityPluginError || error instanceof NotificationError) {
        const message = error.userMessage ?? "Unexpected error occurred";
        return new TRPCError({ message, code: "INTERNAL_SERVER_ERROR" });
      } else if (error instanceof StampHubError) {
        return new TRPCError({ message: error.userMessage, code: error.code });
      } else {
        return new TRPCError({ message: "Unexpected error occurred", code: "INTERNAL_SERVER_ERROR" });
      }
    }
  };

export const convertStampHubErrorFromUnknown =
  (logger: Logger | undefined = undefined) =>
  (unknownError: unknown): StampHubError => {
    logger?.error("convertStampHubErrorFromUnknown function executed", unknownError);
    if (unknownError instanceof Error) {
      return convertStampHubError(unknownError);
    } else {
      return new StampHubError("Unexpected error occurred", "Unexpected error occurred", "INTERNAL_SERVER_ERROR");
    }
  };
