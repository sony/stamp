import { SchedulerProvider } from "@stamp-lib/stamp-types/pluginInterface/scheduler";

import { z } from "zod";
import { createSchedulerEvent } from "./schedulerProvider/createSchedulerEvent";
import { deleteSchedulerEvent } from "./schedulerProvider/deleteSchedulerEvent";
import { getSchedulerEvent } from "./schedulerProvider/getSchedulerEvent";
import { listSchedulerEvent } from "./schedulerProvider/listSchedulerEvent";
import { updateSchedulerEvent } from "./schedulerProvider/updateSchedulerEvent";

export const SchedulerConfig = z.object({
  tableNamePrefix: z.string(),
  tableCategoryName: z.string().default("eventbridge-scheduler"),
  targetSNSTopicArn: z.string(),
  roleArn: z.string(),
  schedulerGroupName: z.string(),
  region: z.string().optional(),
  logLevel: z.enum(["FATAL", "ERROR", "WARN", "INFO", "DEBUG"]).default("INFO"),
});
export type SchedulerConfigInput = z.input<typeof SchedulerConfig>;
export type SchedulerConfig = z.output<typeof SchedulerConfig>;

export const SchedulerContext = SchedulerConfig.omit({ tableNamePrefix: true, tableCategoryName: true }).merge(z.object({ tableName: z.string() }));
export type SchedulerContext = z.output<typeof SchedulerContext>;

export const createSchedulerProvider = (schedulerConfigInput: SchedulerConfigInput): SchedulerProvider => {
  const schedulerConfig = SchedulerConfig.parse(schedulerConfigInput);
  const schedulerContext = SchedulerContext.parse({
    ...schedulerConfig,
    tableName: `${schedulerConfig.tableNamePrefix}-${schedulerConfig.tableCategoryName}-SchedulerEvent`,
  });
  return {
    getSchedulerEvent: getSchedulerEvent(schedulerContext),
    listSchedulerEvent: listSchedulerEvent(schedulerContext),
    createSchedulerEvent: createSchedulerEvent(schedulerContext),
    updateSchedulerEvent: updateSchedulerEvent(schedulerContext),
    deleteSchedulerEvent: deleteSchedulerEvent(schedulerContext),
  };
};
