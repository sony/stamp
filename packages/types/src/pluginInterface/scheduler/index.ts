import { Option } from "@stamp-lib/stamp-option";
import { ResultAsync } from "neverthrow";
import { SchedulePattern, SchedulerEvent } from "../../models/scheduler";
import { SchedulerError } from "./error";

export type SchedulerEventRequestContext = Record<string, string>;

export type GetSchedulerEventInput = {
  id: string;
};
export type GetSchedulerEventOutput = ResultAsync<Option<SchedulerEvent>, SchedulerError>;
export type GetSchedulerEvent = (input: GetSchedulerEventInput, context?: SchedulerEventRequestContext) => GetSchedulerEventOutput;

export type ListSchedulerEventInput = {
  limit?: number;
  paginationToken?: string;
  eventType?: string;
};
export type ListSchedulerEventOutput = ResultAsync<{ items: Array<SchedulerEvent>; nextPaginationToken?: string }, SchedulerError>;
export type ListSchedulerEvent = (input: ListSchedulerEventInput, context?: SchedulerEventRequestContext) => ListSchedulerEventOutput;

export type CreateSchedulerEventInput = {
  eventType: SchedulerEvent["eventType"];
  property: SchedulerEvent["property"];
  schedulePattern: SchedulePattern;
};
export type CreateSchedulerEventOutput = ResultAsync<SchedulerEvent, SchedulerError>;
export type CreateSchedulerEvent = (input: CreateSchedulerEventInput, context?: SchedulerEventRequestContext) => CreateSchedulerEventOutput;

export type UpdateSchedulerEventInput = {
  id: string;
  eventType: SchedulerEvent["eventType"];
  property: SchedulerEvent["property"];
  schedulePattern: SchedulePattern;
};
export type UpdateSchedulerEventOutput = ResultAsync<SchedulerEvent, SchedulerError>;
export type UpdateSchedulerEvent = (input: UpdateSchedulerEventInput, context?: SchedulerEventRequestContext) => UpdateSchedulerEventOutput;

export type DeleteSchedulerEventInput = {
  id: string;
};
export type DeleteSchedulerEventOutput = ResultAsync<void, SchedulerError>;
export type DeleteSchedulerEvent = (input: DeleteSchedulerEventInput, context?: SchedulerEventRequestContext) => DeleteSchedulerEventOutput;

export type SchedulerProvider = {
  getSchedulerEvent: GetSchedulerEvent;
  listSchedulerEvent: ListSchedulerEvent;
  createSchedulerEvent: CreateSchedulerEvent;
  updateSchedulerEvent: UpdateSchedulerEvent;
  deleteSchedulerEvent: DeleteSchedulerEvent;
};

export * from "./error";
