import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync, okAsync } from "neverthrow";

import { PrepareRegisterPermissionInput, PrepareRegisterPermissionOutput } from "../../types/permission";
import { GetPermissionInfo } from "./getPermissionInfo";

export type PrepareRegisterPermission = (input: PrepareRegisterPermissionInput) => ResultAsync<PrepareRegisterPermissionOutput, HandlerError>;

export const prepareRegisterPermission =
  (permissionIdPrefix: string, getPermissionInfo: GetPermissionInfo): PrepareRegisterPermission =>
  (input) => {
    if (permissionIdPrefix.length > 2) {
      // This error is caused by a misconfiguration
      return errAsync(new HandlerError("permissionIdPrefix cannot be longer than 2 characters", "INTERNAL_SERVER_ERROR"));
    }

    const perseResult = PrepareRegisterPermissionInput.safeParse(input);

    if (!perseResult.success) {
      return errAsync(new HandlerError("Invalidate input parameters", "BAD_REQUEST", perseResult.error.toString()));
    }

    const permissionSetNameId = perseResult.data.permissionSetNameId;
    const awsAccountId = perseResult.data.awsAccountId;
    const permissionId = `${permissionIdPrefix}-${permissionSetNameId}-${awsAccountId}`;

    // Check if permissionId already exists
    return getPermissionInfo({ permissionId }).andThen((permissionInfo) => {
      if (permissionInfo.isSome()) {
        const message = `Permission set name id ${permissionId} already exists in AWS Account ${awsAccountId}`;
        return errAsync(new HandlerError(message, "BAD_REQUEST", message));
      }
      return okAsync({ ...perseResult.data, permissionId });
    });
  };
