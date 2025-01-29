import { SchedulerClient, UpdateScheduleCommand } from "@aws-sdk/client-scheduler";
import { SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { ResultAsync } from "neverthrow";

import { Logger } from "@stamp-lib/stamp-logger";
import { SchedulerContext } from "../index";

export type UpdateScheduleInput = { name: string; input: string; scheduleExpression: string };
export type UpdateScheduleOutput = ResultAsync<void, SchedulerError>;
export type UpdateSchedule = (input: UpdateScheduleInput) => UpdateScheduleOutput;

export const updateSchedule =
  (schedulerContext: SchedulerContext, logger: Logger): UpdateSchedule =>
  (input: UpdateScheduleInput) => {
    const client = new SchedulerClient({ region: schedulerContext.region });
    const scheduleCommand = new UpdateScheduleCommand({
      Name: input.name,
      ScheduleExpression: input.scheduleExpression,
      GroupName: schedulerContext.schedulerGroupName,
      Target: {
        Input: input.input,
        Arn: schedulerContext.targetSNSTopicArn,
        RoleArn: schedulerContext.roleArn,
      },
      FlexibleTimeWindow: {
        Mode: "OFF",
      },
    });
    const scheduleResult = ResultAsync.fromPromise(client.send(scheduleCommand), (err) => {
      logger.error(err);
      const message = (err as Error).message ?? "Internal Server Error";
      return new SchedulerError(message, message);
    });

    return scheduleResult.map(() => void 0);
  };
