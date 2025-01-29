import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { DynamoDBClient, ReturnValue } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { AwsAccount } from "../../types/awsAccount";

type Config = { region: string; accountManagementTableName: string };
type UpdateAwsAccountInfoInput = { name: string; accountId: string };
type UpdateAwsAccountInfo = <T extends UpdateAwsAccountInfoInput>(input: T) => ResultAsync<AwsAccount, HandlerError>;

export const updateAwsAccountInfo =
  (logger: Logger, config: Config): UpdateAwsAccountInfo =>
  (input) => {
    const now = new Date().toISOString();
    const param = {
      Key: {
        accountId: input.accountId,
      },
      TableName: config.accountManagementTableName,
      UpdateExpression: "set #nm = :name, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#nm": "name",
      },
      ExpressionAttributeValues: {
        ":name": input.name,
        ":updatedAt": now.toString(),
      },
      ReturnValues: ReturnValue.ALL_NEW,
    };
    const client = new DynamoDBClient({ region: config.region });
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new UpdateCommand(param);
    return ResultAsync.fromPromise(ddbDocClient.send(command), (e) => {
      logger.error("Failed to update item", e);
      const message = `Failed to update item: ${(e as Error).message ?? ""}`;
      return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
    }).andThen(() => {
      return ok({
        accountId: input.accountId,
        name: input.name,
      });
    });
  };
