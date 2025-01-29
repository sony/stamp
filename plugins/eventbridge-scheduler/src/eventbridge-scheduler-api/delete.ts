import { DeleteScheduleCommand, SchedulerClient } from "@aws-sdk/client-scheduler";
import { SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { ResultAsync } from "neverthrow";

import { Logger } from "@stamp-lib/stamp-logger";
import { SchedulerContext } from "../index";

export type DeleteScheduleInput = { name: string };
export type DeleteScheduleOutput = ResultAsync<void, SchedulerError>;
export type DeleteSchedule = (input: DeleteScheduleInput) => DeleteScheduleOutput;

export const deleteSchedule =
  (schedulerContext: SchedulerContext, logger: Logger): DeleteSchedule =>
  (input: DeleteScheduleInput) => {
    const client = new SchedulerClient({ region: schedulerContext.region });
    const deleteScheduleCommand = new DeleteScheduleCommand({
      GroupName: schedulerContext.schedulerGroupName,
      Name: input.name,
    });
    const deleteScheduleResult = ResultAsync.fromPromise(client.send(deleteScheduleCommand), (err) => {
      logger.error(err);
      const message = (err as Error).message ?? "Internal Server Error";
      return new SchedulerError(message, message);
    });

    return deleteScheduleResult.map(() => void 0);
  };
