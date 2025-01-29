import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { AwsAccount } from "../../types/awsAccount";

type Config = { region: string; accountManagementTableName: string };
type UnregisterAwsAccountInput = { accountId: string };
type UnregisterAwsAccount = <T extends UnregisterAwsAccountInput>(input: T) => ResultAsync<AwsAccount, HandlerError>;

export const unregisterAwsAccount =
  (logger: Logger, config: Config): UnregisterAwsAccount =>
  (input) => {
    const param = {
      Key: {
        accountId: input.accountId,
      },
      TableName: config.accountManagementTableName,
    };
    const client = new DynamoDBClient({ region: config.region });
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new DeleteCommand(param);
    return ResultAsync.fromPromise(ddbDocClient.send(command), (e) => {
      logger.error("Failed to delete item", e);
      const message = `Failed to delete item: ${(e as Error).message ?? ""}`;
      return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
    }).andThen(() => {
      return ok({
        accountId: input.accountId,
        name: "", // Returns an empty string
      });
    });
  };
