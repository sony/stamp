import { z } from "zod";
export const SchedulePattern = z.union([
  z.object({
    type: z.literal("cron"),
    expression: z.string().min(1), //TODO: validate cron expression
  }),
  z.object({
    type: z.literal("at"),
    time: z.string().min(1), //TODO: validate time expression
  }),
]);
export type SchedulePattern = z.infer<typeof SchedulePattern>;

export const SchedulerEvent = z.object({
  id: z.string().min(1),
  eventType: z.string().min(1),
  property: z.record(z.string().min(1), z.string()),
  schedulePattern: SchedulePattern,
});
export type SchedulerEvent = z.infer<typeof SchedulerEvent>;
