export type LoggerContext = {
  moduleName: string;
  [key: string]: string;
};

export type LogLevel = "FATAL" | "ERROR" | "WARN" | "INFO" | "DEBUG";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoggerFunc = (...args: any[]) => void;

export type Logger = {
  fatal: LoggerFunc;
  error: LoggerFunc;
  warn: LoggerFunc;
  info: LoggerFunc;
  debug: LoggerFunc;
};

/**
 * This function creates a logger that logs to the console or a custom function.
 * @param logLevel The log level to use.
 * @param context The context to use.
 * @param loggerConsoleLog The console.log function to use.
 */
export const createLogger = (logLevel: LogLevel, context: LoggerContext, loggerConsoleLog: Console["log"] = console.log): Logger => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fatal: (...args: any[]) => {
      loggerImpl(logLevel, context, loggerConsoleLog)("FATAL", ...args);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (...args: any[]) => {
      loggerImpl(logLevel, context, loggerConsoleLog)("ERROR", ...args);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn: (...args: any[]) => {
      loggerImpl(logLevel, context, loggerConsoleLog)("WARN", ...args);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info: (...args: any[]) => {
      loggerImpl(logLevel, context, loggerConsoleLog)("INFO", ...args);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug: (...args: any[]) => {
      loggerImpl(logLevel, context, loggerConsoleLog)("DEBUG", ...args);
    },
  };
};

const loggerImpl =
  (configuredLogLevel: LogLevel, context: LoggerContext, consoleLog: Console["log"]) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (logLevel: LogLevel, ...args: any[]): void => {
    if (shouldLog(configuredLogLevel)(logLevel)) {
      const messages: Array<string> = [];
      for (const arg of args) {
        if (typeof arg === "string") {
          messages.push(arg);
        } else if (arg instanceof Error) {
          // JSON.stringify() does not work on Error objects
          // Because JSON.stringify() only works on objects with enumerable properties
          // So we need to use Object.getOwnPropertyNames to get all properties
          messages.push(JSON.stringify(arg, Object.getOwnPropertyNames(arg)));
        } else {
          messages.push(JSON.stringify(arg));
        }
      }
      let message = "";
      message = messages.join(", ");

      consoleLog(
        JSON.stringify({
          logLevel,
          ...context,
          message,
        })
      );
    }
  };

const shouldLog =
  (configuredLogLevel: LogLevel) =>
  (logLevel: LogLevel): boolean => {
    const currentLogLevel: LogLevel = configuredLogLevel;
    const logLevels: LogLevel[] = ["FATAL", "ERROR", "WARN", "INFO", "DEBUG"];
    return logLevels.indexOf(logLevel) <= logLevels.indexOf(currentLogLevel);
  };
