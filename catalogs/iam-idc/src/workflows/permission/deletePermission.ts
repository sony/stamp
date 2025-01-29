import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, okAsync, errAsync } from "neverthrow";

import { unassignAccessForAccount } from "../../events/accountAssignment/unassignAccessForAccount";
import { deletePermissionSet } from "../../events/permissionSet/deletePermissionSet";
import { deleteGroup } from "../../events/group/deleteGroup";
import { DeletePermissionInfoInput, deletePermissionInfo } from "../../events/permissionInfo/deletePermissionInfo";
import { getPermissionInfo } from "../../events/permissionInfo/getPermissionInfo";
import { Logger } from "@stamp-lib/stamp-logger";
import z from "zod";

type Config = { region: string; identityInstanceArn: string; identityStoreId: string; permissionTableName: string };
export const DeletePermissionInput = DeletePermissionInfoInput;
export type DeletePermissionInput = z.infer<typeof DeletePermissionInput>;

type DeletePermission = (input: DeletePermissionInput) => ResultAsync<void, HandlerError>;

export const deletePermission =
  (logger: Logger, config: Config): DeletePermission =>
  (input) => {
    const unassignAccessFunc = unassignAccessForAccount(logger, config);
    const deleteGroupFunc = deleteGroup(logger, config);
    const deletePermissionSetFunc = deletePermissionSet(logger, config);
    return getPermissionInfo(logger, config.permissionTableName, { region: config.region })(input)
      .andThen((permissionInfo) => {
        if (permissionInfo.isNone()) {
          const message = `Permission ${input.permissionId} is not found`;
          return errAsync(new HandlerError(message, "NOT_FOUND", message));
        }
        return okAsync({
          identityInstanceArn: config.identityInstanceArn,
          identityStoreId: config.identityStoreId,
          permissionSetArn: permissionInfo.value.permissionSetArn,
          groupId: permissionInfo.value.groupId,
          awsAccountId: permissionInfo.value.awsAccountId,
          region: config.region,
          permissionId: input.permissionId,
        });
      })
      .andThen(unassignAccessFunc)
      .andThen(deletePermissionSetFunc)
      .andThen(deleteGroupFunc)
      .andThen(deletePermissionInfo(logger, config.permissionTableName, { region: config.region }));
  };
