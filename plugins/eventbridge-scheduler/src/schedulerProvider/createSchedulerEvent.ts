import { CreateSchedulerEvent, SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { okAsync, errAsync } from "neverthrow";
import { SchedulerContext } from "../index";
import { createSchedule } from "../eventbridge-scheduler-api/create";
import { createLogger } from "@stamp-lib/stamp-logger";
import { SchedulerEvent } from "@stamp-lib/stamp-types/models";

export const createSchedulerEvent =
  (schedulerContext: SchedulerContext): CreateSchedulerEvent =>
  (input, requestContext) => {
    const logger = createLogger(schedulerContext.logLevel, { moduleName: "eventbridge-scheduler", ...requestContext });
    const id = globalThis.crypto.randomUUID();

    const schedulerEvent = SchedulerEvent.safeParse({
      id: id,
      eventType: input.eventType,
      property: input.property,
      schedulePattern: input.schedulePattern,
    });
    if (!schedulerEvent.success) {
      logger.error("Invalid input", schedulerEvent.error);
      return errAsync(new SchedulerError("Invalid input"));
    }

    // Create schedule expression based on EventBridge Scheduler pattern
    // https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html
    let scheduleExpression = "";
    if (schedulerEvent.data.schedulePattern.type === "cron") {
      scheduleExpression = `cron(${schedulerEvent.data.schedulePattern.expression})`;
    } else if (schedulerEvent.data.schedulePattern.type === "at") {
      scheduleExpression = `at(${schedulerEvent.data.schedulePattern.time})`;
    }

    return createSchedule(
      schedulerContext,
      logger
    )({
      name: id,
      input: JSON.stringify(schedulerEvent.data),
      scheduleExpression,
    }).andThen(() => {
      return okAsync(schedulerEvent.data);
    });
  };
