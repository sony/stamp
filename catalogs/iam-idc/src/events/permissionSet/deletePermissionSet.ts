import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { SSOAdminClient, DeletePermissionSetCommand, DeletePermissionSetCommandOutput, ConflictException } from "@aws-sdk/client-sso-admin";
import { exponentialBackoff } from "../../utils/exponentialBackoff";

type Config = { region: string; identityInstanceArn: string };
type DeletePermissionSet = <T extends { permissionSetArn: string }>(input: T) => ResultAsync<T, HandlerError>;

export const deletePermissionSet =
  (logger: Logger, config: Config): DeletePermissionSet =>
  (input) => {
    const client = new SSOAdminClient({ region: config.region });
    const command = new DeletePermissionSetCommand({
      InstanceArn: config.identityInstanceArn,
      PermissionSetArn: input.permissionSetArn,
    });
    return ResultAsync.fromPromise(
      exponentialBackoff<DeletePermissionSetCommandOutput, Error>(
        3,
        1000,
        () => {
          return client.send(command);
        },
        shouldRetryError
      ),
      (e) => {
        logger.error("Failed to delete permission", e);
        const message = `Failed to delete permission: ${(e as Error).message ?? ""}`;
        return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
      }
    ).andThen(() => {
      return ok(input);
    });
  };

const shouldRetryError = (error: Error) => {
  return error instanceof ConflictException;
};
