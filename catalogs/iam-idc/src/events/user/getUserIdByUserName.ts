import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { IdentitystoreClient, ListUsersCommand } from "@aws-sdk/client-identitystore";
import { Logger } from "@stamp-lib/stamp-logger";

type Config = { region: string; identityStoreId: string };
type ExtendUserIdByUserName = <T extends { userName: string }>(input: T) => ResultAsync<T & { userId: string }, HandlerError>;

export const extendUserIdByUserName =
  (logger: Logger, config: Config): ExtendUserIdByUserName =>
  (input) => {
    return getUserIdByUserName(logger, { region: config.region, identityStoreId: config.identityStoreId, userName: input.userName }).andThen((result) => {
      return okAsync(structuredClone({ ...input, userId: result.userId }));
    });
  };

type GetUserIdByUserNameInput = { region: string; identityStoreId: string; userName: string };
type GetUserIdByUserNameOutput = { userId: string };

const getUserIdByUserName = (logger: Logger, { region, identityStoreId, userName }: GetUserIdByUserNameInput) => {
  const client = new IdentitystoreClient({ region });

  const fetchUsers = (nextToken?: string): ResultAsync<GetUserIdByUserNameOutput, HandlerError> => {
    const command = new ListUsersCommand({
      IdentityStoreId: identityStoreId,
      MaxResults: 100,
      NextToken: nextToken,
      Filters: [{ AttributePath: "UserName", AttributeValue: userName }],
    });

    return ResultAsync.fromPromise(client.send(command), (e) => {
      const message = `Failed to list user: ${e}`;
      logger.error(message);
      return new HandlerError(message, "INTERNAL_SERVER_ERROR");
    }).andThen((result) => {
      const user = result.Users?.find((user) => user.UserName === userName);
      if (user && user.UserId) {
        return okAsync({ userId: user.UserId });
      }

      if (result.NextToken) {
        return fetchUsers(result.NextToken);
      } else {
        const message = `The provided username (${userName}) does not exist in the IAM Identity Center.`;
        return errAsync(new HandlerError(message, "BAD_REQUEST", message + " Please check the username is correct and try again."));
      }
    });
  };

  return fetchUsers();
};
