import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { AwsAccount } from "../../types/awsAccount";

type Config = { region: string; accountManagementTableName: string };
type RegisterAwsAccountInput = { name: string; accountId: string };
type RegisterAwsAccount = <T extends RegisterAwsAccountInput>(input: T) => ResultAsync<AwsAccount, HandlerError>;

export const registerAwsAccount =
  (logger: Logger, config: Config): RegisterAwsAccount =>
  (input) => {
    const now = new Date().toISOString();
    const param = {
      Item: {
        accountId: input.accountId,
        name: input.name,
        createdAt: now,
      },
      TableName: config.accountManagementTableName,
    };
    const client = new DynamoDBClient({ region: config.region });
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new PutCommand(param);
    return ResultAsync.fromPromise(ddbDocClient.send(command), (e) => {
      logger.error("Failed to put item", e);
      const message = `Failed to put item: ${(e as Error).message ?? ""}`;
      return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
    }).andThen(() => {
      return ok({
        accountId: input.accountId,
        name: input.name,
      });
    });
  };
