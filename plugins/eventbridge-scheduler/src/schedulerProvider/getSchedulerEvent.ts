import { GetSchedulerEvent } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { getById } from "../database/schedulerEvent";
import { SchedulerContext } from "../index";

import { createLogger } from "@stamp-lib/stamp-logger";

export const getSchedulerEvent =
  (schedulerContext: SchedulerContext): GetSchedulerEvent =>
  (input, requestContext) => {
    const logger = createLogger(schedulerContext.logLevel, { moduleName: "eventbridge-scheduler", ...requestContext });
    return getById({ logger, TableName: schedulerContext.tableName, config: { region: schedulerContext.region } })(input.id);
  };
