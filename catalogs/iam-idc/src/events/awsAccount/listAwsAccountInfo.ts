import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { AwsAccount } from "../../types/awsAccount";

type Config = { region: string; accountManagementTableName: string };
type GetListOfAwsAccountInfo = () => ResultAsync<Array<AwsAccount>, HandlerError>;

export const listAwsAccountInfo =
  (logger: Logger, config: Config): GetListOfAwsAccountInfo =>
  () => {
    const param = {
      ProjectionExpression: "accountId, #nm",
      ExpressionAttributeNames: {
        "#nm": "name",
      },
      TableName: config.accountManagementTableName,
      ConsistentRead: true,
    };
    const client = new DynamoDBClient({ region: config.region });
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const command = new ScanCommand(param);
    return ResultAsync.fromPromise(ddbDocClient.send(command), (e) => {
      logger.error("Failed to list item", e);
      const message = `Failed to list item: ${(e as Error).message ?? ""}`;
      return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
    }).andThen((response) => {
      if (!response.Items) {
        return ok([]);
      }
      const listAccountInfo: AwsAccount[] = [];
      for (const item of response.Items ?? []) {
        if (typeof item.accountId !== "string" || typeof item.name !== "string") {
          continue;
        }
        listAccountInfo.push({
          accountId: item.accountId,
          name: item.name,
        });
      }

      return ok(listAccountInfo);
    });
  };
