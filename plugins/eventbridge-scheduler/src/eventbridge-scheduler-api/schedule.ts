import { CreateScheduleCommand, SchedulerClient } from "@aws-sdk/client-scheduler";
import { ResultAsync } from "neverthrow";
import { SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";

import { SchedulerContext } from "../index";
import { Logger } from "@stamp-lib/stamp-logger";

export type ScheduleInput = { name: string; input: string; scheduleExpression: string };
export type ScheduleOutput = ResultAsync<void, SchedulerError>;
export type Schedule = (input: ScheduleInput) => ScheduleOutput;

export const schedule =
  (schedulerContext: SchedulerContext, logger: Logger): Schedule =>
  (input: ScheduleInput) => {
    const client = new SchedulerClient({ region: schedulerContext.region });
    const scheduleCommand = new CreateScheduleCommand({
      Name: input.name,
      ScheduleExpression: input.scheduleExpression,
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
      return new SchedulerError((err as Error).message ?? "Internal Server Error");
    });

    return scheduleResult.map(() => void 0);
  };
