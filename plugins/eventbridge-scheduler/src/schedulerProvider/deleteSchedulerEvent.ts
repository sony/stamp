import { DeleteSchedulerEvent } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { SchedulerContext } from "../index";
import { deleteSchedule } from "../eventbridge-scheduler-api/delete";
import { createLogger } from "@stamp-lib/stamp-logger";

export const deleteSchedulerEvent =
  (schedulerContext: SchedulerContext): DeleteSchedulerEvent =>
  (input, requestContext) => {
    const logger = createLogger(schedulerContext.logLevel, { moduleName: "eventbridge-scheduler", ...requestContext });

    return deleteSchedule(
      schedulerContext,
      logger
    )({
      name: input.id,
    });
  };
