import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { SSOAdminClient, CreateAccountAssignmentCommand, ConflictException } from "@aws-sdk/client-sso-admin";

type Config = { region: string; identityInstanceArn: string };
type AssignAccessForAccountInput = { permissionSetArn: string; awsAccountId: string; groupId: string };
type AssignAccessForAccount = <T extends AssignAccessForAccountInput>(input: T) => ResultAsync<T, HandlerError>;

export const assignAccessForAccount =
  (logger: Logger, config: Config): AssignAccessForAccount =>
  (input) => {
    return createAccountAssignment(logger)({
      region: config.region,
      identityInstanceArn: config.identityInstanceArn,
      permissionSetArn: input.permissionSetArn,
      awsAccountId: input.awsAccountId,
      groupId: input.groupId,
    })
      .andThen(() => {
        return okAsync(input);
      })
      .orElse((error) => {
        if (error.message === "PermissionSet already assigned.") {
          return okAsync(input);
        }
        return errAsync(error);
      });
  };

type CreateAccountAssignmentInput = { region: string; identityInstanceArn: string; permissionSetArn: string; awsAccountId: string; groupId: string };

const createAccountAssignment =
  (logger: Logger) =>
  ({ region, identityInstanceArn, permissionSetArn, awsAccountId, groupId }: CreateAccountAssignmentInput) => {
    const client = new SSOAdminClient({ region: region });
    const command = new CreateAccountAssignmentCommand({
      InstanceArn: identityInstanceArn,
      TargetId: awsAccountId,
      TargetType: "AWS_ACCOUNT",
      PermissionSetArn: permissionSetArn,
      PrincipalType: "GROUP",
      PrincipalId: groupId,
    });
    return ResultAsync.fromPromise(client.send(command), (e) => {
      if (e instanceof ConflictException && e.message.includes("There is a conflicting operation in process")) {
        return new HandlerError("PermissionSet already assigned.", "INTERNAL_SERVER_ERROR");
      }
      logger.error("Failed to assign permission", e);
      const message = `Failed to assign permission: ${(e as Error).message ?? ""}`;
      return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
    });
  };
