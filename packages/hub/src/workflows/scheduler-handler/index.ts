import { ConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { SchedulerEvent } from "@stamp-lib/stamp-types/models";
import { DBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { IdentityProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, errAsync } from "neverthrow";

import { Logger } from "@stamp-lib/stamp-logger";
import z from "zod";
import { StampHubError } from "../../error";
import { notificationEventHandler } from "./notification";

export const SchedulerHandlerInput = z.object({
  schedulerEvent: SchedulerEvent,
});
export type SchedulerHandlerInput = z.infer<typeof SchedulerHandlerInput>;

export type SchedulerHandler = (schedulerHandlerInput: SchedulerHandlerInput) => ResultAsync<void, StampHubError>;

export interface SchedulerHandlerContext {
  db: DBProvider;
  config: ConfigProvider;
  identity: IdentityProvider;
  logger: Logger;
}

export const schedulerHandler = (schedulerHandlerContext: SchedulerHandlerContext): SchedulerHandler => {
  const logger = schedulerHandlerContext.logger;
  return (schedulerHandlerInput: SchedulerHandlerInput) => {
    const schedulerEvent = SchedulerEvent.safeParse(schedulerHandlerInput.schedulerEvent);
    if (!schedulerEvent.success) {
      logger.error("Failure scheduler event parse", schedulerEvent.error, { schedulerEvent: schedulerHandlerInput.schedulerEvent });
      return errAsync(new StampHubError("Failure scheduler event parse", "Failure scheduler event parse", "BAD_REQUEST"));
    }
    switch (schedulerEvent.data.eventType) {
      case "Notification":
        return notificationEventHandler(schedulerHandlerContext)(schedulerEvent.data);
      default:
        return errAsync(new StampHubError("Invalid scheduler event", "Invalid scheduler event", "BAD_REQUEST"));
    }
  };
};
