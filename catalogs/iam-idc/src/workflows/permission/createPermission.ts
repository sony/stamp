import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync } from "neverthrow";
import { createPermissionSet } from "../../events/permissionSet/createPermissionSet";
import { attachCustomerManagedPolicy } from "../../events/attachedManagedPolicy/attachCustomerManagedPolicy";
import { createGroup } from "../../events/group/createGroup";
import { checkGroupExists } from "../../events/group/checkGroupExists";
import { provisionPermissionSet } from "../../events/permissionSet/provisionPermissionSet";
import { assignAccessForAccount } from "../../events/accountAssignment/assignAccessForAccount";
import { attachManagedPolicy } from "../../events/attachedManagedPolicy/attachManagedPolicy";
import { Logger } from "@stamp-lib/stamp-logger";

import { PrepareRegisterPermissionInput, RegisterPermissionInput, PermissionInfo } from "../../types/permission";

import z from "zod";
import { registerPermissionInfo } from "../../events/permissionInfo/registerPermission";
import { prepareRegisterPermission } from "../../events/permissionInfo/prepareRegisterPermission";
import { getPermissionInfo } from "../../events/permissionInfo/getPermissionInfo";

type Config = { region: string; identityInstanceArn: string; identityStoreId: string; permissionTableName: string; permissionIdPrefix: string };
export const CreatePermissionInput = PrepareRegisterPermissionInput;
export type CreatePermissionInput = z.infer<typeof CreatePermissionInput>;

type CreatePermission = (input: CreatePermissionInput) => ResultAsync<PermissionInfo, HandlerError>;

export const createPermission =
  (logger: Logger, config: Config): CreatePermission =>
  (input) => {
    const getPermissionInfoFunc = getPermissionInfo(logger, config.permissionTableName, { region: config.region });
    const attachManagedPolicyFunc = attachManagedPolicy(logger, config);
    const assignAccessFunc = assignAccessForAccount(logger, config);
    const attachCustomerManagedPolicyFunc = attachCustomerManagedPolicy(logger, config);
    const createGroupFunc = createGroup(logger, config);
    const checkGroupExistsFunc = checkGroupExists(logger, config);
    const createPermissionSetFunc = createPermissionSet(logger, config);
    const provisionPermissionSetFunc = provisionPermissionSet(logger, config);
    return prepareRegisterPermission(
      config.permissionIdPrefix,
      getPermissionInfoFunc
    )(input).andThen((validateResult) => {
      // Check if the group already exists before creating permission resources
      // This prevents multiple permissions from sharing the same group due to case-insensitive naming
      const groupName = `${config.permissionIdPrefix}-${validateResult.permissionSetNameId}-${validateResult.awsAccountId}`;
      return checkGroupExistsFunc({
        groupName,
        permissionId: validateResult.permissionId,
      })
        .mapErr((error) => {
          // Convert GroupExistsError to HandlerError with appropriate error code
          if (error.type === "GroupAlreadyExists") {
            const userMessage = `The Permission Set Name Id "${validateResult.permissionSetNameId}" cannot be used because a similar permission already exists (case-insensitive match). Please choose a different Permission Set Name Id.`;
            return new HandlerError(userMessage, "BAD_REQUEST", error.message);
          }
          // ListGroupsFailed case
          const userMessage = "Failed to verify group availability. Please try again later.";
          return new HandlerError(userMessage, "INTERNAL_SERVER_ERROR", error.message);
        })
        .andThen(() => {
          return createPermissionSetFunc(validateResult)
            .andThen(attachManagedPolicyFunc)
            .andThen(attachCustomerManagedPolicyFunc)
            .andThen(createGroupFunc)
            .andThen(provisionPermissionSetFunc)
            .andThen(assignAccessFunc)
            .andThen((permissionSet) => {
              const registerPermissionInput: RegisterPermissionInput = {
                ...validateResult,
                groupId: permissionSet.groupId,
                permissionSetArn: permissionSet.permissionSetArn,
              };
              return registerPermissionInfo(logger, config.permissionTableName, { region: config.region })(registerPermissionInput);
            });
        });
    });
  };
