import { createLogger } from "@stamp-lib/stamp-logger";
import { SchedulerEvent } from "@stamp-lib/stamp-types/models";
import { SchedulerError, UpdateSchedulerEvent } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { errAsync, okAsync } from "neverthrow";
import { updateSchedule } from "../eventbridge-scheduler-api/update";
import { SchedulerContext } from "../index";

export const updateSchedulerEvent =
  (schedulerContext: SchedulerContext): UpdateSchedulerEvent =>
  (input, requestContext) => {
    const logger = createLogger(schedulerContext.logLevel, { moduleName: "eventbridge-scheduler", ...requestContext });

    const schedulerEvent = SchedulerEvent.safeParse({
      id: input.id,
      eventType: input.eventType,
      property: input.property,
      schedulePattern: input.schedulePattern,
    });
    if (!schedulerEvent.success) {
      logger.error("Invalid input", schedulerEvent.error);
      return errAsync(new SchedulerError("Invalid input"));
    }

    let scheduleExpression = "";
    if (schedulerEvent.data.schedulePattern.type === "cron") {
      scheduleExpression = `cron(${schedulerEvent.data.schedulePattern.expression})`;
    } else if (schedulerEvent.data.schedulePattern.type === "at") {
      scheduleExpression = `at(${schedulerEvent.data.schedulePattern.time})`;
    }

    // update resource in EventBridge
    return updateSchedule(
      schedulerContext,
      logger
    )({
      name: input.id,
      input: JSON.stringify(schedulerEvent.data),
      scheduleExpression,
    }).andThen(() => {
      return okAsync(schedulerEvent.data);
    });
  };
