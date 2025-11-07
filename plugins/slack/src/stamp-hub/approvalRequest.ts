import { isStampHubClientError, StampHubRouterOutput, StampHubRouterInput, StampHubRouterClient } from "@stamp-lib/stamp-hub";

import { ResultAsync } from "neverthrow";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { Logger } from "@stamp-lib/stamp-logger";
import { Option, some, none } from "@stamp-lib/stamp-option";
import { unwrapOr } from "../utils/stampHubClient";

export type ApproveRequestInput = StampHubRouterInput["userRequest"]["approvalRequest"]["approve"];
export type ApproveRequest = (
  approveRequestInput: ApproveRequestInput
) => ResultAsync<StampHubRouterOutput["userRequest"]["approvalRequest"]["approve"], NotificationError>;

export const approveRequest =
  (logger: Logger, approveRequest: StampHubRouterClient["userRequest"]["approvalRequest"]["approve"]): ApproveRequest =>
  (input: ApproveRequestInput) => {
    const requestStampHub = async () => {
      const approvedRequest = await approveRequest.mutate(input);
      return approvedRequest;
    };

    return ResultAsync.fromPromise(requestStampHub(), (err) => {
      logger.error(err);
      if (isStampHubClientError(err)) {
        return new NotificationError(err.message, err.message);
      }
      return new NotificationError((err as Error).message ?? "Internal Server Error");
    });
  };

export type RejectRequestInput = StampHubRouterInput["userRequest"]["approvalRequest"]["reject"];
export type RejectRequest = (rejectRequestInput: RejectRequestInput) => ResultAsync<undefined, NotificationError>;

export const rejectRequest =
  (logger: Logger, rejectRequest: StampHubRouterClient["userRequest"]["approvalRequest"]["reject"]): RejectRequest =>
  (input: RejectRequestInput) => {
    const requestStampHub = async () => {
      await rejectRequest.mutate(input);
      return undefined;
    };

    return ResultAsync.fromPromise(requestStampHub(), (err) => {
      logger.error(err);
      if (isStampHubClientError(err)) {
        return new NotificationError(err.message, err.message);
      }
      return new NotificationError((err as Error).message ?? "Internal Server Error");
    });
  };

export type RequestInfo = StampHubRouterOutput["userRequest"]["approvalRequest"]["get"];
export type GetRequestInput = StampHubRouterInput["userRequest"]["approvalRequest"]["get"];
export type GetRequestInfo = (getRequestInput: GetRequestInput) => ResultAsync<Option<RequestInfo>, NotificationError>;

export const getRequestInfo =
  (logger: Logger, getRequest: StampHubRouterClient["userRequest"]["approvalRequest"]["get"]): GetRequestInfo =>
  (input: GetRequestInput) => {
    const requestStampHub = async () => {
      const requestInfo = await unwrapOr(getRequest.query(input), undefined);
      if (!requestInfo) {
        return none;
      }
      return some(requestInfo);
    };

    return ResultAsync.fromPromise(requestStampHub(), (err) => {
      logger.error(err);
      if (isStampHubClientError(err)) {
        return new NotificationError(err.message, err.message);
      }
      return new NotificationError((err as Error).message ?? "Internal Server Error");
    });
  };
