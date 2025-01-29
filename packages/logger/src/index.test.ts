import { describe, expect, it, vitest } from "vitest";
import { createLogger } from "./index";

describe("createLogger", () => {
  it("should log an error", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("ERROR", { moduleName: "test" });
    logger.error("Error message");
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "ERROR",
        moduleName: "test",
        message: "Error message",
      })
    );
    spy.mockRestore();
  });

  it("should log a warning", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("WARN", { moduleName: "test" });
    logger.warn("Warning message");
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "WARN",
        moduleName: "test",
        message: "Warning message",
      })
    );
    spy.mockRestore();
  });

  it("should log an info", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("INFO", { moduleName: "test" });
    logger.info("Info message");
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "INFO",
        moduleName: "test",
        message: "Info message",
      })
    );
    spy.mockRestore();
  });

  it("should log a debug", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("DEBUG", { moduleName: "test" });
    logger.debug("Debug message");
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "DEBUG",
        moduleName: "test",
        message: "Debug message",
      })
    );
    spy.mockRestore();
  });

  it("should log a fatal", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("FATAL", { moduleName: "test" });
    logger.fatal("Fatal message");
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "FATAL",
        moduleName: "test",
        message: "Fatal message",
      })
    );
    spy.mockRestore();
  });

  it("should not log a debug when log level is FATAL", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("FATAL", { moduleName: "test" });
    logger.debug("Debug message");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should not log a debug when log level is INFO", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("INFO", { moduleName: "test" });
    logger.debug("Debug message");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should not log an info when log level is WARN", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("WARN", { moduleName: "test" });
    logger.info("Info message");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should log Error Object", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("ERROR", { moduleName: "test" });
    logger.error(new Error("Error message"));
    const logObject = JSON.parse(spy.mock.calls[0][0]);
    expect(logObject).toStrictEqual({
      logLevel: "ERROR",
      moduleName: "test",
      message: expect.stringContaining('"stack":"Error: Error message'),
    });
    spy.mockRestore();
  });

  it("should log custom Error class Object", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("ERROR", { moduleName: "test" });

    class MyError extends Error {
      constructor(message: string, public code: string) {
        super(message);
        this.name = "MyError";
      }
    }
    logger.error(new MyError("Error message", "ERROR_CODE"));
    const logObject = JSON.parse(spy.mock.calls[0][0]);

    expect(logObject).toStrictEqual({
      logLevel: "ERROR",
      moduleName: "test",
      message: expect.any(String),
    });

    const outputMessage = logObject.message;
    expect(outputMessage).toContain('"stack":"MyError: Error message');
    expect(outputMessage).toContain('"code":"ERROR_CODE"');
    expect(outputMessage).toContain('"name":"MyError"');

    spy.mockRestore();
  });

  it("should log Object", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("ERROR", { moduleName: "test" });
    logger.error({ foo: "bar" });
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "ERROR",
        moduleName: "test",
        message: '{"foo":"bar"}',
      })
    );
    spy.mockRestore();
  });

  it("should log multiple arguments", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("ERROR", { moduleName: "test" });
    logger.error("Error message", { foo: "bar" });
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "ERROR",
        moduleName: "test",
        message: 'Error message, {"foo":"bar"}',
      })
    );
    spy.mockRestore();
  });

  it("should log multiple arguments with number", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("ERROR", { moduleName: "test" });
    logger.error("Error message", 42);
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "ERROR",
        moduleName: "test",
        message: "Error message, 42",
      })
    );
    spy.mockRestore();
  });

  it("should log multiple arguments with boolean", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("ERROR", { moduleName: "test" });
    logger.error("Error message", true);
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "ERROR",
        moduleName: "test",
        message: "Error message, true",
      })
    );
    spy.mockRestore();
  });

  it("should log multiple arguments with null", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("ERROR", { moduleName: "test" });
    logger.error("Error message", null);
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "ERROR",
        moduleName: "test",
        message: "Error message, null",
      })
    );
    spy.mockRestore();
  });

  it("should log multiple arguments with undefined", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("ERROR", { moduleName: "test" });
    logger.error("Error message", undefined);
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "ERROR",
        moduleName: "test",
        message: "Error message, ",
      })
    );
    spy.mockRestore();
  });

  it("should log with context", () => {
    const spy = vitest.spyOn(console, "log");
    const logger = createLogger("ERROR", { moduleName: "test", requestId: "123" });
    logger.error("Error message");
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "ERROR",
        moduleName: "test",
        requestId: "123",
        message: "Error message",
      })
    );
    spy.mockRestore();
  });

  it("should log with custom console log", () => {
    const consoleLog = vitest.fn();
    const logger = createLogger("ERROR", { moduleName: "test" }, consoleLog);
    logger.error("Error message");
    expect(consoleLog).toHaveBeenCalledWith(
      JSON.stringify({
        logLevel: "ERROR",
        moduleName: "test",
        message: "Error message",
      })
    );
  });
});
