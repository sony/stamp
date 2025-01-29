import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { RevokedOutput } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { extendUserIdByUserName } from "../../events/user/getUserIdByUserName";
import { deleteGroupMembership } from "../../events/groupMembership/deleteGroupMembership";
import { extendGroupMembershipId } from "../../events/groupMembership/extendGroupMembershipId";
import z from "zod";
import { getPermissionInfo } from "../../events/permissionInfo/getPermissionInfo";
import { Logger } from "@stamp-lib/stamp-logger";

type Config = { region: string; identityStoreId: string; permissionTableName: string };
export const RevokedInput = z.object({
  permissionId: z.string(),
  userName: z.string(),
});
export type RevokedInput = z.infer<typeof RevokedInput>;
type Revoked = (input: RevokedInput) => Promise<RevokedOutput>;

export const revoked =
  (logger: Logger, config: Config): Revoked =>
  async (input) => {
    const parsedResult = RevokedInput.safeParse(input);
    if (!parsedResult.success) {
      return { isSuccess: false, message: "Invalid input." };
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
      .andThen(extendUserIdByUserName(logger, config))
      .andThen(extendGroupMembershipId(logger, config));

    const deleteGroupMembershipResult = extendGetPermissionResult.andThen(deleteGroupMembership(logger, config));

    const result = await ResultAsync.combine([extendGetPermissionResult, deleteGroupMembershipResult]).match(
      ([extendPermissionInfo]) => {
        return {
          isSuccess: true,
          message: `Revoked permission ${extendPermissionInfo.name} from user ${extendPermissionInfo.userName}`,
        };
      },
      (error) => {
        if (error instanceof HandlerError && error.message === "Group membership not found.") {
          // Maybe membership has already been canceled
          return {
            isSuccess: true,
            message: "Maybe membership has already been canceled",
          };
        }
        return {
          isSuccess: false,
          message: error.userMessage ?? "Revoked is failed",
        };
      }
    );
    return result;
  };
