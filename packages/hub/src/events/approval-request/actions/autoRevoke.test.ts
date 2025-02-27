import { validateAutoRevokeDurationTime, settingAutoRevoke } from "./autoRevoke";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { StampHubError } from "../../../error";
import { errAsync, okAsync } from "neverthrow";
import { Logger, createLogger } from "@stamp-lib/stamp-logger";

// Example UUID for request
const REQUEST_UUID = "14adaa62-81df-4ebb-8317-10504eb71442";
// Example UUID for scheduler event
const SCHEDULER_EVENT_UUID = "1be69a8f-87e4-4eae-97bf-2d34d051c97d";

describe("validateAutoRevokeDurationTime", () => {
  const logger: Logger = createLogger("DEBUG", {
    moduleName: "test-module",
  });

  it("validates when duration is less than maxDuration", () => {
    const result = validateAutoRevokeDurationTime(logger)("P15D", "P30D");
    expect(result.isOk()).toBeTruthy();
  });

  it("validates when duration is equal to maxDuration", () => {
    const result = validateAutoRevokeDurationTime(logger)("P30D", "P30D");
    expect(result.isOk()).toBeTruthy();
  });

  it("validates with valid durations with hours", () => {
    const result = validateAutoRevokeDurationTime(logger)("PT12H", "PT24H");
    expect(result.isOk()).toBeTruthy();
  });

  it("validates with valid durations with days and hours", () => {
    const result = validateAutoRevokeDurationTime(logger)("P10DT12H", "P20DT12H");
    expect(result.isOk()).toBeTruthy();
  });

  it("fails when duration exceeds maxDuration in days", () => {
    const result = validateAutoRevokeDurationTime(logger)("P31D", "P30D");
    expect(result._unsafeUnwrapErr().message).toBe("autoRevokeDuration exceeds maxDuration limits");
  });

  it("fails when duration equals maxDuration days but exceeds hours", () => {
    const result = validateAutoRevokeDurationTime(logger)("P30DT1H", "P30D");
    expect(result._unsafeUnwrapErr().message).toBe("autoRevokeDuration exceeds maxDuration limits");
  });

  it("fails with invalid duration format", () => {
    const result = validateAutoRevokeDurationTime(logger)("10 days", "P30D");
    expect(result._unsafeUnwrapErr().message).toBe("Invalid Duration format");
  });

  it("fails with invalid maxDuration format", () => {
    const result = validateAutoRevokeDurationTime(logger)("P10D", "30 days");
    expect(result._unsafeUnwrapErr().message).toBe("Invalid maxDuration format");
  });

  it("fails when days exceed 99 in duration", () => {
    const result = validateAutoRevokeDurationTime(logger)("P100D", "P11D");
    console.log(result);
    expect(result._unsafeUnwrapErr().message).toBe("Invalid Duration format");
  });

  it("fails when hours exceed 99 in duration", () => {
    const result = validateAutoRevokeDurationTime(logger)("PT100H", "PT11H");
    expect(result._unsafeUnwrapErr().message).toBe("Invalid Duration format");
  });
});

describe("settingAutoRevoke", () => {
  const logger: Logger = createLogger("DEBUG", {
    moduleName: "test-module",
  });
  const mockCreateSchedulerEvent = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("successfully creates a scheduler event with days duration", async () => {
    mockCreateSchedulerEvent.mockResolvedValue(okAsync({ id: SCHEDULER_EVENT_UUID }));

    const input = {
      autoRevokeDuration: "P5D",
      catalogId: "catalog-123",
      approvalFlowId: "flow-123",
      requestId: REQUEST_UUID,
    };

    const expectedTime = new Date("2023-01-06T12:00:00Z"); // Add 5 days

    const result = await settingAutoRevoke(mockCreateSchedulerEvent, logger)(input);

    expect(result.isOk()).toBeTruthy();
    expect(mockCreateSchedulerEvent).toHaveBeenCalledWith({
      eventType: "ApprovalRequestAutoRevoke",
      property: {
        catalogId: "catalog-123",
        approvalFlowId: "flow-123",
        requestId: REQUEST_UUID,
      },
      schedulePattern: {
        type: "at",
        time: expectedTime.toISOString(),
      },
    });
  });

  it("successfully creates a scheduler event with hours duration", async () => {
    mockCreateSchedulerEvent.mockResolvedValue(okAsync({ id: SCHEDULER_EVENT_UUID }));

    const input = {
      autoRevokeDuration: "PT8H",
      catalogId: "catalog-123",
      approvalFlowId: "flow-123",
      requestId: REQUEST_UUID,
    };

    const expectedTime = new Date("2023-01-01T20:00:00Z"); // Add 8 hours

    const result = await settingAutoRevoke(mockCreateSchedulerEvent, logger)(input);

    expect(result.isOk()).toBeTruthy();
    expect(mockCreateSchedulerEvent).toHaveBeenCalledWith({
      eventType: "ApprovalRequestAutoRevoke",
      property: expect.objectContaining({
        requestId: REQUEST_UUID,
      }),
      schedulePattern: {
        type: "at",
        time: expectedTime.toISOString(),
      },
    });
  });

  it("successfully creates a scheduler event with days and hours duration", async () => {
    mockCreateSchedulerEvent.mockResolvedValue(okAsync({ id: SCHEDULER_EVENT_UUID }));

    const input = {
      autoRevokeDuration: "P3DT12H",
      catalogId: "catalog-123",
      approvalFlowId: "flow-123",
      requestId: REQUEST_UUID,
    };

    const expectedTime = new Date("2023-01-05T00:00:00Z"); // Add 3 days and 12 hours

    const result = await settingAutoRevoke(mockCreateSchedulerEvent, logger)(input);

    expect(result.isOk()).toBeTruthy();
    expect(mockCreateSchedulerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        schedulePattern: {
          type: "at",
          time: expectedTime.toISOString(),
        },
      })
    );
  });

  it("fails when autoRevokeDuration is invalid", async () => {
    const input = {
      autoRevokeDuration: "invalid-duration",
      catalogId: "catalog-123",
      approvalFlowId: "flow-123",
      requestId: REQUEST_UUID,
    };

    const result = await settingAutoRevoke(mockCreateSchedulerEvent, logger)(input);

    expect(result.isErr()).toBeTruthy();
    expect(mockCreateSchedulerEvent).not.toHaveBeenCalled();
  });

  it("fails when createSchedulerEvent returns error", async () => {
    const schedulerError = new StampHubError("Scheduler service unavailable", "The scheduler service is temporarily unavailable", "INTERNAL_SERVER_ERROR");
    mockCreateSchedulerEvent.mockResolvedValue(errAsync(schedulerError));

    const input = {
      autoRevokeDuration: "P1DT6H",
      catalogId: "catalog-123",
      approvalFlowId: "flow-123",
      requestId: REQUEST_UUID,
    };

    const result = await settingAutoRevoke(mockCreateSchedulerEvent, logger)(input);

    expect(result._unsafeUnwrapErr().message).toContain("Failed to create scheduler event");
    expect(result._unsafeUnwrapErr().userMessage).toContain("The scheduler service is temporarily unavailable");
    expect(mockCreateSchedulerEvent).toHaveBeenCalled();
  });
});
