import { ResultAsync, Result, ok, err } from "neverthrow";
import { StampHubError } from "../../../error";
import { CreateSchedulerEvent } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { Logger } from "@stamp-lib/stamp-logger";

export const validateAutoRevokeDurationTime =
  (logger: Logger) =>
  (duration: string, maxDuration: string): Result<void, StampHubError> => {
    const durationParseResult = parseAutoRevokeDuration(duration);
    if (durationParseResult.isErr()) {
      logger.info(`Invalid duration format: ${duration}`, durationParseResult.error);
      return err(new StampHubError("Invalid Duration format", "Invalid Duration format", "BAD_REQUEST"));
    }
    const maxDurationParseResult = parseAutoRevokeDuration(maxDuration);
    if (maxDurationParseResult.isErr()) {
      logger.info(`Invalid maxDuration format: ${maxDuration}`, maxDurationParseResult.error);
      return err(new StampHubError("Invalid maxDuration format", "Invalid maxDuration format", "BAD_REQUEST"));
    }

    const parsedDuration = durationParseResult.value;
    const parsedMaxDuration = maxDurationParseResult.value;

    if (parsedDuration.days > parsedMaxDuration.days || (parsedDuration.days === parsedMaxDuration.days && parsedDuration.hours > parsedMaxDuration.hours)) {
      return err(new StampHubError("autoRevokeDuration exceeds maxDuration limits", "autoRevokeDuration exceeds maxDuration limits", "BAD_REQUEST"));
    }

    return ok(undefined);
  };

const parseAutoRevokeDuration = (duration: string): Result<{ days: number; hours: number }, StampHubError> => {
  const durationMatch = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/);
  if (durationMatch) {
    const days = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
    const hours = durationMatch[2] ? parseInt(durationMatch[2]) : 0;
    // Validate input to check duration is day is within 99 days and hour within 99 hours.
    // Currently, duration accepted is 2 digits for days and 2 digits for hours.
    if (days > 99) {
      return err(new StampHubError("Duration exceeds limits. Days exceed 99 days", "Duration exceeds limits. Days exceed 99 days", "BAD_REQUEST"));
    }
    if (hours > 99) {
      return err(new StampHubError("Duration exceeds limits. Hours exceed 99 hours", "Duration exceeds limits. Hours exceed 99 hours", "BAD_REQUEST"));
    }
    return ok({ days, hours });
  } else {
    return err(new StampHubError("Invalid Duration format", "Duration does not match expected format", "BAD_REQUEST"));
  }
};

// Format date as yyyy-MM-ddThh:mm:ss
const formatDateForScheduler = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const settingAutoRevoke =
  (createSchedulerEvent: CreateSchedulerEvent, logger: Logger) =>
  <T extends { autoRevokeDuration: string; catalogId: string; approvalFlowId: string; requestId: string }>(input: T): ResultAsync<T, StampHubError> => {
    return new ResultAsync(
      (async () => {
        const { catalogId, approvalFlowId, requestId, autoRevokeDuration } = input;
        const parseResult = parseAutoRevokeDuration(autoRevokeDuration);
        if (parseResult.isErr()) {
          logger.error(`Failed to parse autoRevokeDuration: ${autoRevokeDuration}`);
          return err(parseResult.error);
        }
        const { days, hours } = parseResult.value;
        const revokeTime = new Date();
        revokeTime.setDate(revokeTime.getDate() + days);
        revokeTime.setHours(revokeTime.getHours() + hours);
        logger.info(`Setting auto revoke for request ${requestId} to ${formatDateForScheduler(revokeTime)}`);
        const result = await createSchedulerEvent({
          eventType: "ApprovalRequestAutoRevoke",
          property: {
            catalogId,
            approvalFlowId,
            requestId,
          },
          schedulePattern: {
            type: "at",
            time: formatDateForScheduler(revokeTime),
          },
        });
        if (result.isErr()) {
          logger.error(`Failed to create scheduler event for request ${requestId}: ${result.error}`);
          return err(
            new StampHubError(
              "Failed to create scheduler event. " + result.error.message,
              "Failed to create scheduler event. " + result.error.userMessage,
              "INTERNAL_SERVER_ERROR"
            )
          );
        }
        logger.info(`Auto revoke set for request ${requestId} with event ID ${result.value.id}`);
        return ok(input);
      })()
    );
  };
