import { GetScheduleCommand, SchedulerClient, ResourceNotFoundException } from "@aws-sdk/client-scheduler";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";

import { SchedulerContext } from "../index";
import { Logger } from "@stamp-lib/stamp-logger";
import { Option, some, none } from "@stamp-lib/stamp-option";

export type Schedule = { name: string; input: string; scheduleExpression: string };
export type GetScheduleInput = { name: string };
export type GetScheduleOutput = ResultAsync<Option<Schedule>, SchedulerError>;
export type GetSchedule = (input: GetScheduleInput) => GetScheduleOutput;

export const getSchedule =
  (schedulerContext: SchedulerContext, logger: Logger): GetSchedule =>
  (input: GetScheduleInput) => {
    const client = new SchedulerClient({ region: schedulerContext.region });
    const getScheduleCommand = new GetScheduleCommand({
      Name: input.name,
      GroupName: schedulerContext.schedulerGroupName,
    });
    const getScheduleResult = ResultAsync.fromPromise(client.send(getScheduleCommand), (err) => err);

    return getScheduleResult
      .andThen((result) => {
        if (result.Target === undefined) {
          logger.error("Schedule Target not found");
          return errAsync(new SchedulerError("Schedule Target not found"));
        } else {
          return okAsync(
            some({
              name: input.name,
              input: result.Target.Input,
              scheduleExpression: result.ScheduleExpression,
            }) as Option<Schedule> // Type assertion for orElse to work
          );
        }
      })
      .orElse((err) => {
        // If schedule is not found, return none
        if (err instanceof ResourceNotFoundException) {
          return okAsync(none);
        }
        logger.error(err);
        return errAsync(new SchedulerError((err as Error).message ?? "Internal Server Error"));
      });
  };
