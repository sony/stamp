import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { SSOAdminClient, ProvisionPermissionSetCommand, ConflictException } from "@aws-sdk/client-sso-admin";

type Config = { region: string; identityInstanceArn: string };
type ProvisionPermissionSetInput = { permissionSetArn: string; awsAccountId: string };
type ProvisionPermissionSet = <T extends ProvisionPermissionSetInput>(input: T) => ResultAsync<T, HandlerError>;

export const provisionPermissionSet =
  (logger: Logger, config: Config): ProvisionPermissionSet =>
  (input) => {
    return provisionPermissionSetWithinIamIdentityCenter(logger)({
      region: config.region,
      identityInstanceArn: config.identityInstanceArn,
      permissionSetArn: input.permissionSetArn,
      awsAccountId: input.awsAccountId,
    })
      .andThen(() => {
        return okAsync(input);
      })
      .orElse((error) => {
        if (error.message === "There is a conflicting operation in process.") {
          return okAsync(input);
        }
        return errAsync(error);
      });
  };

type ProvisionPermissionSetWithinIamIdentityCenterInput = { region: string; identityInstanceArn: string; permissionSetArn: string; awsAccountId: string };

const provisionPermissionSetWithinIamIdentityCenter =
  (logger: Logger) =>
  ({ region, identityInstanceArn, permissionSetArn, awsAccountId }: ProvisionPermissionSetWithinIamIdentityCenterInput) => {
    const client = new SSOAdminClient({ region: region });
    const command = new ProvisionPermissionSetCommand({
      InstanceArn: identityInstanceArn,
      PermissionSetArn: permissionSetArn,
      TargetType: "AWS_ACCOUNT",
      TargetId: awsAccountId,
    });
    return ResultAsync.fromPromise(client.send(command), (e) => {
      if (e instanceof ConflictException && e.message.includes("There is a conflicting operation in process")) {
        return new HandlerError("There is a conflicting operation in process.", "INTERNAL_SERVER_ERROR");
      }
      logger.error("Failed to provision permission", e);
      const message = `Failed to provision permission: ${(e as Error).message ?? ""}`;
      return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
    });
  };
