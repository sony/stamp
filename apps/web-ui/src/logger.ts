import { createLogger, LogLevel } from "@stamp-lib/stamp-logger";

export function createServerLogger() {
  const logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "INFO";
  return createLogger(logLevel, { moduleName: "nextjs" });
}
