import { StampHubRouterClient } from "@stamp-lib/stamp-hub";
import { User } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync } from "neverthrow";
import { Option, some, none } from "@stamp-lib/stamp-option";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { Logger } from "@stamp-lib/stamp-logger";

export type GetStampHubUser = (userId: string) => ResultAsync<Option<User>, NotificationError>;

export const getStampHubUser = (logger: Logger, getStampHubUser: StampHubRouterClient["systemRequest"]["user"]["get"]) => (userId: string) => {
  const getUser = async () => {
    const user = await getStampHubUser.query({ userId });
    if (!user) {
      return none;
    }
    return some(user);
  };

  return ResultAsync.fromPromise(getUser(), (err) => {
    logger.error(err);
    return new NotificationError((err as Error).message ?? "Internal Server Error");
  });
};
