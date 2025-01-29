import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Option, some, none } from "@stamp-lib/stamp-option";
import { AwsAccount } from "../../types/awsAccount";

type Config = { region: string; accountManagementTableName: string };
type GetAwsAccountInfoInput = { accountId: string };
type GetAwsAccountInfo = <T extends GetAwsAccountInfoInput>(input: T) => ResultAsync<Option<AwsAccount>, HandlerError>;

export const getAwsAccountInfo =
  (logger: Logger, config: Config): GetAwsAccountInfo =>
  (input) => {
    const param = {
      Key: {
        accountId: input.accountId,
      },
      TableName: config.accountManagementTableName,
    };
    const client = new DynamoDBClient({ region: config.region });
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new GetCommand(param);
    return ResultAsync.fromPromise(ddbDocClient.send(command), (e) => {
      logger.error("Failed to get item", e);
      const message = `Failed to get item: ${(e as Error).message ?? ""}`;
      return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
    }).andThen((data) => {
      if (!data.Item) {
        return ok(none);
      }
      return ok(
        some({
          accountId: data.Item.accountId,
          name: data.Item.name,
        })
      );
    });
  };
