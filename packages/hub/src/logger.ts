import { Logger, LogLevel, createLogger } from "@stamp-lib/stamp-logger";

export const createStampHubLogger = (requestContext?: Record<string, string>): Logger => {
  const logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "INFO";
  return createLogger(logLevel, { moduleName: "hub", requestContext: JSON.stringify(requestContext) });
};
