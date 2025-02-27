import { CreateScheduleCommand, SchedulerClient } from "@aws-sdk/client-scheduler";
import { SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { ResultAsync } from "neverthrow";

import { Logger } from "@stamp-lib/stamp-logger";
import { SchedulerContext } from "../index";

export type CreateScheduleInput = { name: string; input: string; scheduleExpression: string };
export type CreateScheduleOutput = ResultAsync<void, SchedulerError>;
export type CreateSchedule = (input: CreateScheduleInput) => CreateScheduleOutput;

export const createSchedule =
  (schedulerContext: SchedulerContext, logger: Logger): CreateSchedule =>
  (input: CreateScheduleInput) => {
    const client = new SchedulerClient({ region: schedulerContext.region });
    const scheduleCommand = new CreateScheduleCommand({
      Name: input.name,
      ScheduleExpression: input.scheduleExpression,
      GroupName: schedulerContext.schedulerGroupName,
      Target: {
        Input: input.input,
        Arn: schedulerContext.targetSNSTopicArn,
        RoleArn: schedulerContext.roleArn,
      },
      FlexibleTimeWindow: {
        Mode: "FLEXIBLE",
        MaximumWindowInMinutes: 10,
      },
      ActionAfterCompletion: "DELETE",
    });
    const scheduleResult = ResultAsync.fromPromise(client.send(scheduleCommand), (err) => {
      logger.error(err);
      const message = (err as Error).message ?? "Internal Server Error";
      return new SchedulerError(message, message);
    });

    return scheduleResult.map(() => void 0);
  };
