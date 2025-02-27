import { SchedulerProvider } from "@stamp-lib/stamp-types/pluginInterface/scheduler";

import { z } from "zod";
import { createSchedulerEvent } from "./schedulerProvider/createSchedulerEvent";
import { deleteSchedulerEvent } from "./schedulerProvider/deleteSchedulerEvent";
import { getSchedulerEvent } from "./schedulerProvider/getSchedulerEvent";
import { updateSchedulerEvent } from "./schedulerProvider/updateSchedulerEvent";

export const SchedulerConfig = z.object({
  targetSNSTopicArn: z.string(),
  roleArn: z.string(),
  schedulerGroupName: z.string(),
  region: z.string().optional(),
  logLevel: z.enum(["FATAL", "ERROR", "WARN", "INFO", "DEBUG"]).default("INFO"),
});
export type SchedulerConfigInput = z.input<typeof SchedulerConfig>;
export type SchedulerConfig = z.output<typeof SchedulerConfig>;

export const SchedulerContext = SchedulerConfig;
export type SchedulerContext = z.output<typeof SchedulerContext>;

export const createSchedulerProvider = (schedulerConfigInput: SchedulerConfigInput): SchedulerProvider => {
  const schedulerConfig = SchedulerConfig.parse(schedulerConfigInput);
  const schedulerContext = SchedulerContext.parse(schedulerConfig);
  return {
    getSchedulerEvent: getSchedulerEvent(schedulerContext),
    createSchedulerEvent: createSchedulerEvent(schedulerContext),
    updateSchedulerEvent: updateSchedulerEvent(schedulerContext),
    deleteSchedulerEvent: deleteSchedulerEvent(schedulerContext),
  };
};
