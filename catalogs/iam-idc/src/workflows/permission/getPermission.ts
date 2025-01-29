import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync, okAsync } from "neverthrow";

import { getPermissionInfo } from "../../events/permissionInfo/getPermissionInfo";
import { PermissionInfo } from "../../types/permission";
import { Logger } from "@stamp-lib/stamp-logger";

type Config = { region: string; permissionTableName: string };
export type GetPermissionInput = { permissionId: string };
export type GetPermission = (input: GetPermissionInput) => ResultAsync<PermissionInfo, HandlerError>;

export const getPermission =
  (logger: Logger, config: Config): GetPermission =>
  (input) => {
    return getPermissionInfo(logger, config.permissionTableName, { region: config.region })(input).andThen((permissionInfo) => {
      if (permissionInfo.isNone()) {
        return errAsync(new HandlerError("Permission not found", "NOT_FOUND"));
      }
      return okAsync(permissionInfo.value);
    });
  };
