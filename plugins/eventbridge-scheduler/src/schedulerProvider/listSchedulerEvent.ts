import { ListSchedulerEvent } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { listAll, listByEventType } from "../database/schedulerEvent";
import { SchedulerContext } from "../index";

import { createLogger } from "@stamp-lib/stamp-logger";

export const listSchedulerEvent =
  (schedulerContext: SchedulerContext): ListSchedulerEvent =>
  (input, requestContext) => {
    const logger = createLogger(schedulerContext.logLevel, { moduleName: "eventbridge-scheduler", ...requestContext });
    if (input.eventType) {
      return listByEventType({ logger, TableName: schedulerContext.tableName, config: { region: schedulerContext.region } })({
        ...input,
        eventType: input.eventType,
      });
    } else {
      return listAll({ logger, TableName: schedulerContext.tableName, config: { region: schedulerContext.region } })(input);
    }
  };
