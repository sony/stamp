import { isStampHubClientError, StampHubRouterOutput, StampHubRouterClient } from "@stamp-lib/stamp-hub";

import { ResultAsync } from "neverthrow";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { Option, some, none } from "@stamp-lib/stamp-option";
import { unwrapOr } from "../utils/stampHubClient";
import { Logger } from "@stamp-lib/stamp-logger";

export type AccountLink = StampHubRouterOutput["systemRequest"]["accountLink"]["get"];

export type GetAccountLinkInput = { slackUserId: string };
export type GetAccountLink = (getAccountLinkInput: GetAccountLinkInput) => ResultAsync<Option<AccountLink>, NotificationError>;

export const getAccountLink =
  (logger: Logger, getAccountLink: StampHubRouterClient["systemRequest"]["accountLink"]["get"], notificationPluginId: string): GetAccountLink =>
  (input: GetAccountLinkInput) => {
    // accountProviderName is the same as the notificationPluginConfig ID.
    const accountProviderName = notificationPluginId;
    const requestStampHub = async () => {
      const accountLink = await unwrapOr(
        getAccountLink.query({
          accountProviderName,
          accountId: input.slackUserId,
        }),
        undefined
      );

      if (!accountLink) {
        return none;
      }
      return some(accountLink);
    };

    return ResultAsync.fromPromise(requestStampHub(), (err) => {
      logger.error(err);
      if (isStampHubClientError(err)) {
        return new NotificationError(err.message, err.message);
      }
      return new NotificationError((err as Error).message ?? "Internal Server Error");
    });
  };
