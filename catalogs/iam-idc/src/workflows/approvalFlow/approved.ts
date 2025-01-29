import { ApprovedOutput, HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { ApprovalFlowRequestInput } from "../../types/approvalFlow";
import { extendUserIdByUserName } from "../../events/user/getUserIdByUserName";
import { createGroupMembership } from "../../events/groupMembership/createGroupMembership";
import { getPermissionInfo } from "../../events/permissionInfo/getPermissionInfo";
import z from "zod";
import { Logger } from "@stamp-lib/stamp-logger";

export const ApprovedInput = ApprovalFlowRequestInput;
export type ApprovedInput = z.infer<typeof ApprovedInput>;

type Config = { region: string; identityStoreId: string; permissionTableName: string };
type Approved = (input: ApprovedInput) => Promise<ApprovedOutput>;

export const approved =
  (logger: Logger, config: Config): Approved =>
  async (input) => {
    const parsedResult = ApprovedInput.safeParse(input);
    if (!parsedResult.success) {
      return {
        isSuccess: false,
        message: `Invalid input.`,
      };
    }
    const parsedInput = parsedResult.data;

    const extendGetPermissionResult = getPermissionInfo(logger, config.permissionTableName, { region: config.region })(parsedInput)
      .andThen((permissionInfo) => {
        if (permissionInfo.isNone()) {
          logger.warn("Permission not found", parsedInput);
          const message = `Permission ${parsedInput.permissionId} is not found`;
          return errAsync(new HandlerError(message, "NOT_FOUND", message));
        }
        return okAsync({
          ...permissionInfo.value,
          userName: input.userName,
        });
      })
      .andThen(extendUserIdByUserName(logger, config));

    const createGroupMemberShipResult = extendGetPermissionResult.andThen(createGroupMembership(logger, config));

    const result = await ResultAsync.combine([extendGetPermissionResult, createGroupMemberShipResult]).match(
      ([extendPermissionInfo]) => {
        const message = `Add ${extendPermissionInfo.name} permission(AWS AccountId:(${extendPermissionInfo.awsAccountId}) to user ${extendPermissionInfo.userName}`;

        return {
          isSuccess: true,
          message: message,
        };
      },
      (error) => {
        return {
          isSuccess: false,
          message: error.userMessage ?? "Approved is failed",
        };
      }
    );
    return result;
  };
