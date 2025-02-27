import { GetSchedulerEvent, SchedulerError, GetSchedulerEventOutput } from "@stamp-lib/stamp-types/pluginInterface/scheduler";

import { SchedulerContext } from "../index";
import { getSchedule } from "../eventbridge-scheduler-api/get";
import { createLogger } from "@stamp-lib/stamp-logger";
import { SchedulerEvent } from "@stamp-lib/stamp-types/models";
import { none, some } from "@stamp-lib/stamp-option";
import { errAsync, okAsync } from "neverthrow";
export const getSchedulerEvent =
  (schedulerContext: SchedulerContext): GetSchedulerEvent =>
  (input, requestContext): GetSchedulerEventOutput => {
    const logger = createLogger(schedulerContext.logLevel, { moduleName: "eventbridge-scheduler", ...requestContext });
    return getSchedule(
      schedulerContext,
      logger
    )({ name: input.id }).andThen((event) => {
      if (event.isNone()) {
        return okAsync(none);
      }
      const schedulerEvent = SchedulerEvent.safeParse(JSON.parse(event.value.input));

      if (!schedulerEvent.success) {
        logger.error("Failed to parse scheduler event", schedulerEvent.error);
        return errAsync(new SchedulerError(`Failed to parse scheduler event`));
      }

      logger.info("Parsed scheduler event:", schedulerEvent);

      return okAsync(some(schedulerEvent.data));
    });
  };
