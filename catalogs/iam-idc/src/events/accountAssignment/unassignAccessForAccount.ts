import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { SSOAdminClient, DeleteAccountAssignmentCommand, DeleteAccountAssignmentCommandOutput, ConflictException } from "@aws-sdk/client-sso-admin";
import { exponentialBackoff } from "../../utils/exponentialBackoff";

type Config = { region: string; identityInstanceArn: string };
type UnassignAccessForAccountInput = { awsAccountId: string; permissionSetArn: string; groupId: string };
type UnassignAccessForAccount = <T extends UnassignAccessForAccountInput>(input: T) => ResultAsync<T, HandlerError>;

export const unassignAccessForAccount =
  (logger: Logger, config: Config): UnassignAccessForAccount =>
  (input) => {
    const client = new SSOAdminClient({ region: config.region });
    const command = new DeleteAccountAssignmentCommand({
      InstanceArn: config.identityInstanceArn,
      TargetId: input.awsAccountId,
      TargetType: "AWS_ACCOUNT",
      PermissionSetArn: input.permissionSetArn,
      PrincipalType: "GROUP",
      PrincipalId: input.groupId,
    });
    return ResultAsync.fromPromise(
      exponentialBackoff<DeleteAccountAssignmentCommandOutput, Error>(3, 1000, () => client.send(command), shouldRetryError),
      (e) => {
        logger.error("Failed to unassign permission", e);
        const message = `Failed to unassign permission: ${(e as Error).message ?? ""}`;
        return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
      }
    ).andThen(() => {
      return ok(input);
    });
  };

const shouldRetryError = (error: Error) => {
  return error instanceof ConflictException;
};
