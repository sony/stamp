import {
  ApprovalRequestDBProvider,
  ApprovalRequestDBGetByIdResult,
  ApprovalRequestDBListResult,
  ApprovalRequestDBSetResult,
  RequestDateQuery,
  UpdateStatusToApprovedInput,
  UpdateStatusToApprovedResult,
  UpdateStatusToRejectedInput,
  UpdateStatusToRejectedResult,
  UpdateStatusToRevokedInput,
  UpdateStatusToRevokedResult,
  UpdateStatusToCanceledInput,
  UpdateStatusToCanceledResult,
} from "@stamp-lib/stamp-types/pluginInterface/database";
import {
  ApprovalRequest,
  ValidationFailedRequest,
  PendingRequest,
  ApprovedRequest,
  ApprovedActionSucceededRequest,
  ApprovedActionFailedRequest,
  RejectedRequest,
  CanceledRequest,
  RevokedRequest,
  RevokedActionSucceededRequest,
  RevokedActionFailedRequest,
  SubmittedRequest,
} from "@stamp-lib/stamp-types/models";
import { z } from "zod";

import { okAsync, ResultAsync } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { parseDBItemAsync, parseDBInputAsync } from "./utils/neverthrow";
import { serializeObject, deserializeObject } from "./utils/pagination";
import { ApprovalFlowInput, DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { Logger } from "@stamp-lib/stamp-logger";

export function getByIdImpl(logger: Logger) {
  return (requestId: string, TableName: string, config: DynamoDBClientConfig = {}): ApprovalRequestDBGetByIdResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const getResult = ResultAsync.fromPromise(ddbDocClient.send(new GetCommand({ TableName: TableName, Key: { requestId } })), (err) => {
      logger.error(err);
      return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
    });

    return getResult.andThen((result) => {
      if (result.Item === undefined) {
        return okAsync(none);
      } else {
        return parseDBItemAsync(logger)(result.Item, ApprovalRequest).map((item) => some(item));
      }
    });
  };
}

export function listByApprovalFlowIdImpl(logger: Logger) {
  return (input: ApprovalFlowInput, TableName: string, config: DynamoDBClientConfig = {}): ApprovalRequestDBListResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    return parseDBInputAsync(input, ApprovalFlowInput).andThen((approvalFlowKey) => {
      const compositeKey = `${approvalFlowKey.catalogId}#${approvalFlowKey.approvalFlowId}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let exclusiveStartKey: Record<string, any> | undefined = undefined;
      if (input.paginationToken) {
        exclusiveStartKey = deserializeObject(input.paginationToken);
      }

      let keyConditionExpression = "#catalogId_approvalFlowId = :catalogId_approvalFlowId";
      if (input.requestDate) {
        keyConditionExpression += " AND requestDate BETWEEN :start and :end";
      }

      const queryResult = ResultAsync.fromPromise(
        ddbDocClient.send(
          new QueryCommand({
            TableName: TableName,
            IndexName: "catalogId_approvalFlowId_index",
            ExpressionAttributeNames: {
              "#catalogId_approvalFlowId": "catalogId#approvalFlowId",
            },
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: {
              ":catalogId_approvalFlowId": compositeKey,
              ":start": input.requestDate?.start,
              ":end": input.requestDate?.end,
            },
            ExclusiveStartKey: exclusiveStartKey,
            Limit: input.limit,
            ScanIndexForward: false, // Sort by created Date desc
          })
        ),
        (err) => {
          logger.error(err);
          return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
        }
      );

      return queryResult.andThen((result) => {
        if (result.Items === undefined) {
          return okAsync({ items: [], paginationToken: undefined });
        } else {
          let paginationToken: string | undefined = undefined;
          if (result.LastEvaluatedKey) {
            paginationToken = serializeObject(result.LastEvaluatedKey);
          }
          return parseDBItemAsync(logger)(result.Items, z.array(ApprovalRequest)).map((items) => ({ items, paginationToken: paginationToken }));
        }
      });
    });
  };
}

export function listByRequestUserIdImpl(logger: Logger) {
  return (
    input: { requestUserId: string; paginationToken?: string; requestDate?: RequestDateQuery; limit?: number },
    TableName: string,
    config: DynamoDBClientConfig = {}
  ): ApprovalRequestDBListResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let exclusiveStartKey: Record<string, any> | undefined = undefined;
    if (input.paginationToken) {
      exclusiveStartKey = deserializeObject(input.paginationToken);
    }

    let keyConditionExpression = "requestUserId = :requestUserId";
    if (input.requestDate) {
      keyConditionExpression += " AND requestDate BETWEEN :start and :end";
    }

    const queryResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new QueryCommand({
          TableName: TableName,
          IndexName: "requestUserId_index",
          KeyConditionExpression: keyConditionExpression,
          ExpressionAttributeValues: {
            ":requestUserId": input.requestUserId,
            ":start": input.requestDate?.start,
            ":end": input.requestDate?.end,
          },
          ExclusiveStartKey: exclusiveStartKey,
          Limit: input.limit,
          ScanIndexForward: false, // Sort by created Date desc
        })
      ),
      (err) => {
        logger.error(err);
        return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    );

    return queryResult.andThen((result) => {
      if (result.Items === undefined) {
        return okAsync({ items: [], paginationToken: undefined });
      } else {
        let paginationToken: string | undefined = undefined;
        if (result.LastEvaluatedKey) {
          paginationToken = serializeObject(result.LastEvaluatedKey);
        }
        return parseDBItemAsync(logger)(result.Items, z.array(ApprovalRequest)).map((items) => ({ items, paginationToken: paginationToken }));
      }
    });
  };
}

export function listByApproverIdImpl(logger: Logger) {
  return (
    input: { approverId: string; paginationToken?: string; requestDate?: RequestDateQuery; limit?: number },
    TableName: string,
    config: DynamoDBClientConfig = {}
  ): ApprovalRequestDBListResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let exclusiveStartKey: Record<string, any> | undefined = undefined;
    if (input.paginationToken) {
      exclusiveStartKey = deserializeObject(input.paginationToken);
    }

    let keyConditionExpression = "approverId = :approverId";
    if (input.requestDate) {
      keyConditionExpression += " AND requestDate BETWEEN :start and :end";
    }

    const queryResult = ResultAsync.fromPromise(
      ddbDocClient.send(
        new QueryCommand({
          TableName: TableName,
          IndexName: "approverId_index",
          KeyConditionExpression: keyConditionExpression,
          ExpressionAttributeValues: {
            ":approverId": input.approverId,
            ":start": input.requestDate?.start,
            ":end": input.requestDate?.end,
          },
          ExclusiveStartKey: exclusiveStartKey,
          Limit: input.limit,
          ScanIndexForward: false, // Sort by created Date desc
        })
      ),
      (err) => {
        logger.error(err);
        return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    );

    return queryResult.andThen((result) => {
      if (result.Items === undefined) {
        return okAsync({ items: [], paginationToken: undefined });
      } else {
        let paginationToken: string | undefined = undefined;
        if (result.LastEvaluatedKey) {
          paginationToken = serializeObject(result.LastEvaluatedKey);
        }
        return parseDBItemAsync(logger)(result.Items, z.array(ApprovalRequest)).map((items) => ({ items, paginationToken: paginationToken }));
      }
    });
  };
}

export function setImpl(logger: Logger) {
  return <
    T extends
      | SubmittedRequest
      | ValidationFailedRequest
      | PendingRequest
      | ApprovedRequest
      | ApprovedActionSucceededRequest
      | ApprovedActionFailedRequest
      | RejectedRequest
      | CanceledRequest
      | RevokedRequest
      | RevokedActionSucceededRequest
      | RevokedActionFailedRequest
  >(
    approvalRequest: T,
    TableName: string,
    config: DynamoDBClientConfig = {}
  ): ApprovalRequestDBSetResult<T> => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

    return parseDBInputAsync(approvalRequest, ApprovalRequest)
      .andThen((approvalRequest) => {
        // Add composite key
        const dbItem = { ...approvalRequest, "catalogId#approvalFlowId": `${approvalRequest.catalogId}#${approvalRequest.approvalFlowId}` };

        return ResultAsync.fromPromise(
          ddbDocClient.send(
            new PutCommand({
              TableName: TableName,
              Item: dbItem,
            })
          ),
          (err) => {
            logger.error(err);
            return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
          }
        );
      })
      .andThen(() => okAsync(approvalRequest));
  };
}

export function updateStatusToApprovedImpl(logger: Logger) {
  return (input: UpdateStatusToApprovedInput, TableName: string, config: DynamoDBClientConfig = {}): UpdateStatusToApprovedResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

    return parseDBInputAsync(input, UpdateStatusToApprovedInput)
      .andThen((input) => {
        return ResultAsync.fromPromise(
          ddbDocClient.send(
            new UpdateCommand({
              TableName: TableName,
              Key: {
                requestId: input.requestId,
              },
              ConditionExpression: "attribute_exists(requestId) AND #status = :pending",
              ExpressionAttributeNames: {
                "#status": "status",
              },
              ExpressionAttributeValues: {
                ":pending": "pending",
                ":approved": "approved",
                ":approvedDate": input.approvedDate,
                ":userIdWhoApproved": input.userIdWhoApproved,
                ":approvedComment": input.approvedComment,
              },
              UpdateExpression:
                "SET #status = :approved, approvedDate = :approvedDate, userIdWhoApproved = :userIdWhoApproved, approvedComment = :approvedComment",
              ReturnValues: "ALL_NEW",
            })
          ),
          (err) => {
            if ((err as Error).name === "ConditionalCheckFailedException") {
              logger.error("Condition check failed", err);
              const message = "Approval request does not exist or status is not pending.";
              return new DBError(message, message);
            } else {
              logger.error(err);
              return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
            }
          }
        );
      })
      .andThen((result) => {
        return parseDBItemAsync(logger)(result.Attributes, ApprovedRequest);
      });
  };
}

export function updateStatusToRejectedImpl(logger: Logger) {
  return (input: UpdateStatusToRejectedInput, TableName: string, config: DynamoDBClientConfig = {}): UpdateStatusToRejectedResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

    return parseDBInputAsync(input, UpdateStatusToRejectedInput)
      .andThen((input) => {
        return ResultAsync.fromPromise(
          ddbDocClient.send(
            new UpdateCommand({
              TableName: TableName,
              Key: {
                requestId: input.requestId,
              },
              ConditionExpression: "attribute_exists(requestId) AND #status = :pending",
              ExpressionAttributeNames: {
                "#status": "status",
              },
              ExpressionAttributeValues: {
                ":pending": "pending",
                ":rejected": "rejected",
                ":rejectedDate": input.rejectedDate,
                ":userIdWhoRejected": input.userIdWhoRejected,
                ":rejectComment": input.rejectComment,
              },
              UpdateExpression: "SET #status = :rejected, rejectedDate = :rejectedDate, userIdWhoRejected = :userIdWhoRejected, rejectComment = :rejectComment",
              ReturnValues: "ALL_NEW",
            })
          ),
          (err) => {
            if ((err as Error).name === "ConditionalCheckFailedException") {
              logger.error("Condition check failed", err);
              const message = "Approval request does not exist or status is not pending.";
              return new DBError(message, message);
            } else {
              logger.error(err);
              return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
            }
          }
        );
      })
      .andThen((result) => {
        return parseDBItemAsync(logger)(result.Attributes, RejectedRequest);
      });
  };
}

export function updateStatusToRevokedImpl(logger: Logger) {
  return (input: UpdateStatusToRevokedInput, TableName: string, config: DynamoDBClientConfig = {}): UpdateStatusToRevokedResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

    return parseDBInputAsync(input, UpdateStatusToRevokedInput)
      .andThen((input) => {
        return ResultAsync.fromPromise(
          ddbDocClient.send(
            new UpdateCommand({
              TableName: TableName,
              Key: {
                requestId: input.requestId,
              },
              ConditionExpression: "attribute_exists(requestId) AND (#status = :approvedActionSucceeded OR #status = :approved)", // Allowing Approved status because previous stamp hub versions of the model don't have approvedActionSucceeded status.
              ExpressionAttributeNames: {
                "#status": "status",
              },
              ExpressionAttributeValues: {
                ":approvedActionSucceeded": "approvedActionSucceeded",
                ":approved": "approved",
                ":revoked": "revoked",
                ":revokedDate": input.revokedDate,
                ":userIdWhoRevoked": input.userIdWhoRevoked,
                ":revokedComment": input.revokedComment,
              },
              UpdateExpression: "SET #status = :revoked, revokedDate = :revokedDate, userIdWhoRevoked = :userIdWhoRevoked, revokedComment = :revokedComment",
              ReturnValues: "ALL_NEW",
            })
          ),
          (err) => {
            if ((err as Error).name === "ConditionalCheckFailedException") {
              logger.error("Condition check failed", err);
              const message = "Approval request does not exist or status is not approvedActionSucceeded or approved.";
              return new DBError(message, message);
            } else {
              logger.error(err);
              return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
            }
          }
        );
      })
      .andThen((result) => {
        return parseDBItemAsync(logger)(result.Attributes, RevokedRequest);
      });
  };
}

/**
 * Delete ApprovalRequest for test purpose
 */
export function deleteImpl(logger: Logger) {
  return (requestId: string, TableName: string, config: DynamoDBClientConfig = {}): ApprovalRequestDBSetResult<ApprovalRequest> => {
    logger.info("ApprovalRequestDB.delete", requestId);
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    return ResultAsync.fromPromise(
      ddbDocClient.send(
        new DeleteCommand({
          TableName: TableName,
          Key: { requestId },
        })
      ),
      (err) => {
        logger.error(err);
        return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
      }
    ).andThen(() => okAsync({} as ApprovalRequest));
  };
}

export function updateStatusToCanceledImpl(logger: Logger) {
  return (input: UpdateStatusToCanceledInput, TableName: string, config: DynamoDBClientConfig = {}): UpdateStatusToCanceledResult => {
    const client = new DynamoDBClient(config);
    const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

    return parseDBInputAsync(input, UpdateStatusToCanceledInput)
      .andThen((input) => {
        return ResultAsync.fromPromise(
          ddbDocClient.send(
            new UpdateCommand({
              TableName: TableName,
              Key: {
                requestId: input.requestId,
              },
              ConditionExpression: "attribute_exists(requestId) AND #status = :pending",
              ExpressionAttributeNames: {
                "#status": "status",
              },
              ExpressionAttributeValues: {
                ":pending": "pending",
                ":canceled": "canceled",
                ":canceledDate": input.canceledDate,
                ":userIdWhoCanceled": input.userIdWhoCanceled,
                ":cancelComment": input.cancelComment,
              },
              UpdateExpression: "SET #status = :canceled, canceledDate = :canceledDate, userIdWhoCanceled = :userIdWhoCanceled, cancelComment = :cancelComment",
              ReturnValues: "ALL_NEW",
            })
          ),
          (err) => {
            if ((err as Error).name === "ConditionalCheckFailedException") {
              logger.error("Condition check failed", err);
              const message = "Approval request does not exist or status is not pending.";
              return new DBError(message, message);
            } else {
              logger.error(err);
              return new DBError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR");
            }
          }
        );
      })
      .andThen((result) => {
        return parseDBItemAsync(logger)(result.Attributes, CanceledRequest);
      });
  };
}

export const createApprovalRequestDBProvider =
  (logger: Logger) =>
  (TableName: string, config: DynamoDBClientConfig = {}): ApprovalRequestDBProvider => {
    return {
      getById: (requestId: string) => getByIdImpl(logger)(requestId, TableName, config),
      listByApprovalFlowId: (input: { catalogId: string; approvalFlowId: string; paginationToken?: string; requestDate?: RequestDateQuery; limit?: number }) =>
        listByApprovalFlowIdImpl(logger)(input, TableName, config),
      listByRequestUserId: (input: { requestUserId: string; paginationToken?: string; requestDate?: RequestDateQuery; limit?: number }) =>
        listByRequestUserIdImpl(logger)(input, TableName, config),
      listByApproverId: (input: { approverId: string; paginationToken?: string; requestDate?: RequestDateQuery; limit?: number }) =>
        listByApproverIdImpl(logger)(input, TableName, config),
      set: <
        T extends
          | SubmittedRequest
          | ValidationFailedRequest
          | PendingRequest
          | ApprovedRequest
          | ApprovedActionSucceededRequest
          | ApprovedActionFailedRequest
          | RejectedRequest
          | CanceledRequest
          | RevokedRequest
          | RevokedActionSucceededRequest
          | RevokedActionFailedRequest
      >(
        approvalRequest: T
      ) => setImpl(logger)(approvalRequest, TableName, config),
      updateStatusToApproved: (input: UpdateStatusToApprovedInput) => updateStatusToApprovedImpl(logger)(input, TableName, config),
      updateStatusToRejected: (input: UpdateStatusToRejectedInput) => updateStatusToRejectedImpl(logger)(input, TableName, config),
      updateStatusToRevoked: (input: UpdateStatusToRevokedInput) => updateStatusToRevokedImpl(logger)(input, TableName, config),
      updateStatusToCanceled: (input: UpdateStatusToCanceledInput) => updateStatusToCanceledImpl(logger)(input, TableName, config),
    };
  };
