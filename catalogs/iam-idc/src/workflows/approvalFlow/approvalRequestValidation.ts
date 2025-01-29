import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { z } from "zod";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ApprovalFlowRequestInput } from "../../types/approvalFlow";
import { extendUserIdByUserName } from "../../events/user/getUserIdByUserName";
import { getPermissionInfo } from "../../events/permissionInfo/getPermissionInfo";
import { getAwsAccountInfo } from "../../events/awsAccount/getAwsAccountInfo";
import { Logger } from "@stamp-lib/stamp-logger";

export const ValidateApprovalRequestInput = ApprovalFlowRequestInput;
export type ValidateApprovalRequestInput = z.infer<typeof ApprovalFlowRequestInput>;

export type ValidateApprovalRequestOutput = {
  isSuccess: boolean;
  message: string;
};

type Config = { region: string; identityStoreId: string; permissionTableName: string; accountManagementTableName: string };
type ValidateApprovalRequest = (input: ValidateApprovalRequestInput) => Promise<ValidateApprovalRequestOutput>;

export const validateApprovalRequest =
  (logger: Logger, config: Config): ValidateApprovalRequest =>
  async (input) => {
    const parsedResult = ValidateApprovalRequestInput.safeParse(input);

    if (!parsedResult.success) {
      const message = `Invalid input. ${parsedResult.error.toString()}`;
      return { isSuccess: false, message: message };
    }
    const getUserResult = extendUserIdByUserName(logger, config)(parsedResult.data);
    const getResourceInfoResult = getPermissionInfo(logger, config.permissionTableName, { region: config.region })(parsedResult.data)
      .andThen((permissionInfoOption) => {
        if (permissionInfoOption.isNone()) {
          const message = `Permission ${parsedResult.data.permissionId} is not found`;
          return errAsync(new HandlerError(message, "BAD_REQUEST", message));
        }
        return okAsync(permissionInfoOption.value);
      })
      .andThen((permissionInfo) => {
        return getAwsAccountInfo(
          logger,
          config
        )({ accountId: permissionInfo.awsAccountId }).andThen((awsAccountInfoOption) => {
          if (awsAccountInfoOption.isNone()) {
            const message = `AWS Account ${permissionInfo.awsAccountId} is not found`;
            return errAsync(new HandlerError(message, "BAD_REQUEST", message));
          }
          return okAsync({ awsAccountInfo: awsAccountInfoOption.value, permissionInfo: permissionInfo });
        });
      });

    const result = await ResultAsync.combine([getUserResult, getResourceInfoResult]).match(
      ([userInfo, resourceInfo]) => {
        const message = `This is a request for user ${userInfo.userName} to access ${resourceInfo.permissionInfo.name} permission.
  AWS Account: ${resourceInfo.awsAccountInfo.name} (${resourceInfo.awsAccountInfo.accountId})
  IAM Policy Name: ${[...resourceInfo.permissionInfo.managedIamPolicyNames, ...resourceInfo.permissionInfo.customIamPolicyNames].join(",")}`;
        return { isSuccess: true, message: message };
      },
      (error) => {
        logger.warn("Failed to validate approval request", error);
        const message = error.userMessage ?? "Request validation is failed";
        return {
          isSuccess: false,
          message: message,
        };
      }
    );

    return result;
  };
