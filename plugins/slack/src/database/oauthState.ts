import { ZodError, z } from "zod";
import { UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, Result, errAsync } from "neverthrow";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { some, none, Option } from "@stamp-lib/stamp-option";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { Logger } from "@stamp-lib/stamp-logger";

export const OauthState = z.object({
  state: z.string().uuid(),
  sessionKey: z.string(),
  stampUserId: UserId,
  expirationTime: z.number(),
});
export type OauthState = z.infer<typeof OauthState>;

export const SetOauthStateInput = OauthState;
export type SetOauthStateInput = z.infer<typeof SetOauthStateInput>;
export type SetOauthState = (input: SetOauthStateInput) => ResultAsync<OauthState, NotificationError>;

export const setOauthState =
  (logger: Logger, tableName: string, config: DynamoDBClientConfig = {}): SetOauthState =>
  (input: SetOauthStateInput) => {
    const parse = Result.fromThrowable(SetOauthStateInput.parse, (error) => {
      return new NotificationError((error as ZodError).message, (error as ZodError).name);
    });

    const parsedResult = parse(input);
    if (parsedResult.isErr()) {
      return errAsync(parsedResult.error);
    }

    const requestDynamodb = async () => {
      const client = new DynamoDBClient(config);
      const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

      const params = {
        TableName: tableName,
        Item: parsedResult.value,
      };
      await ddbDocClient.send(new PutCommand(params));
      return parsedResult.value;
    };

    return ResultAsync.fromPromise(requestDynamodb(), (err) => {
      logger.error(err);
      return new NotificationError((err as Error).message ?? "Internal Server Error");
    });
  };

export const GetOauthStateInput = z.object({
  state: z.string().uuid(),
});
export type GetOauthStateInput = z.infer<typeof GetOauthStateInput>;
export type GetOauthState = (input: GetOauthStateInput) => ResultAsync<Option<OauthState>, NotificationError>;

export const getOauthState =
  (logger: Logger, tableName: string, config: DynamoDBClientConfig = {}): GetOauthState =>
  (input: GetOauthStateInput) => {
    const parse = Result.fromThrowable(GetOauthStateInput.parse, (error) => {
      return new NotificationError((error as ZodError).message, (error as ZodError).name);
    });

    const parsedResult = parse(input);
    if (parsedResult.isErr()) {
      return errAsync(parsedResult.error);
    }

    const requestDynamodb = async () => {
      const client = new DynamoDBClient(config);
      const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

      const params = {
        TableName: tableName,
        Key: {
          state: parsedResult.value.state,
        },
      };
      const result = await ddbDocClient.send(new GetCommand(params));
      if (!result.Item) {
        return none;
      }
      return some(result.Item as OauthState);
    };

    return ResultAsync.fromPromise(requestDynamodb(), (err) => {
      logger.error(err);
      return new NotificationError((err as Error).message ?? "Internal Server Error");
    });
  };

export const DeleteOauthStateInput = z.object({
  state: z.string().uuid(),
});
export type DeleteOauthStateInput = z.infer<typeof DeleteOauthStateInput>;
export type DeleteOauthState = (input: DeleteOauthStateInput) => ResultAsync<void, NotificationError>;

export const deleteOauthState =
  (logger: Logger, tableName: string, config: DynamoDBClientConfig = {}): DeleteOauthState =>
  (input: DeleteOauthStateInput) => {
    const parse = Result.fromThrowable(DeleteOauthStateInput.parse, (error) => {
      return new NotificationError((error as ZodError).message, (error as ZodError).name);
    });

    const parsedResult = parse(input);
    if (parsedResult.isErr()) {
      return errAsync(parsedResult.error);
    }

    const requestDynamodb = async () => {
      const client = new DynamoDBClient(config);
      const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

      const params = {
        TableName: tableName,
        Key: {
          state: parsedResult.value.state,
        },
      };
      await ddbDocClient.send(new DeleteCommand(params));
    };

    return ResultAsync.fromPromise(requestDynamodb(), (err) => {
      logger.error(err);
      return new NotificationError((err as Error).message ?? "Internal Server Error");
    });
  };
