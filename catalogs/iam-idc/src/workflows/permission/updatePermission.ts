import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync } from "neverthrow";
import { updatePermissionSet } from "../../events/permissionSet/updatePermissionSet";
import { provisionPermissionSet } from "../../events/permissionSet/provisionPermissionSet";
import { Logger } from "@stamp-lib/stamp-logger";

import { UpdatePermissionInput, UpdatePermissionOutput } from "../../types/permission";
import { updatePermissionInfo } from "../../events/permissionInfo/updatePermissionInfo";
import { getPermissionInfo } from "../../events/permissionInfo/getPermissionInfo";

type Config = {
  region: string;
  identityInstanceArn: string;
  identityStoreId: string;
  permissionTableName: string;
  permissionIdPrefix: string;
};

type UpdatePermission = (input: UpdatePermissionInput) => ResultAsync<UpdatePermissionOutput, HandlerError>;

export const updatePermission =
  (logger: Logger, config: Config): UpdatePermission =>
  (input) => {
    const getPermissionInfoFunc = getPermissionInfo(logger, config.permissionTableName, { region: config.region });
    const updatePermissionSetFunc = updatePermissionSet(logger, config);
    const provisionPermissionSetFunc = provisionPermissionSet(logger, config);

    return getPermissionInfoFunc({ permissionId: input.permissionId }).andThen((existingPermissionOpt) => {
      if (existingPermissionOpt.isNone()) {
        return errAsync(new HandlerError("Permission not found", "NOT_FOUND"));
      }

      const existingPermission = existingPermissionOpt.value;

      // Prepare the update input for permission set
      const updatePermissionSetInput = {
        permissionSetArn: existingPermission.permissionSetArn,
        awsAccountId: existingPermission.awsAccountId,
        description: input.description,
        sessionDuration: input.sessionDuration,
        managedIamPolicyNames: input.managedIamPolicyNames,
        customIamPolicyNames: input.customIamPolicyNames,
      };

      return updatePermissionSetFunc(updatePermissionSetInput)
        .andThen(() => {
          // Provision the updated permission set
          return provisionPermissionSetFunc({
            permissionSetArn: existingPermission.permissionSetArn,
            awsAccountId: existingPermission.awsAccountId,
          });
        })
        .andThen(() => {
          // Update the permission info in the database
          const updatedPermissionInfo = {
            ...existingPermission,
            ...(input.description !== undefined && { description: input.description }),
            ...(input.sessionDuration !== undefined && { sessionDuration: input.sessionDuration }),
            ...(input.managedIamPolicyNames !== undefined && { managedIamPolicyNames: input.managedIamPolicyNames }),
            ...(input.customIamPolicyNames !== undefined && { customIamPolicyNames: input.customIamPolicyNames }),
            updatedAt: new Date().toISOString(),
          };

          return updatePermissionInfo(logger, config.permissionTableName, { region: config.region })(updatedPermissionInfo);
        });
    });
  };
