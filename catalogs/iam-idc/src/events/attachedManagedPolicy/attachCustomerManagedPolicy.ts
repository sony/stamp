import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { SSOAdminClient, AttachCustomerManagedPolicyReferenceToPermissionSetCommand, ConflictException } from "@aws-sdk/client-sso-admin";

type Config = { region: string; identityInstanceArn: string };
type AttachCustomerManagedPolicyInput = { customIamPolicyNames: Array<string>; permissionSetArn: string };
type AttachCustomerManagedPolicy = <T extends AttachCustomerManagedPolicyInput>(input: T) => ResultAsync<T, HandlerError>;

export const attachCustomerManagedPolicy =
  (logger: Logger, config: Config): AttachCustomerManagedPolicy =>
  (input) => {
    return attachCustomerManagedPolicyReference(logger)({
      region: config.region,
      identityInstanceArn: config.identityInstanceArn,
      permissionSetArn: input.permissionSetArn,
      customIamPolicyNames: input.customIamPolicyNames,
    })
      .andThen(() => {
        return okAsync(input);
      })
      .orElse((error) => {
        if (error.message === "Given customer managed policy already attached.") {
          return okAsync(input);
        }
        return errAsync(error);
      });
  };

type AttachCustomerManagedPolicyReferenceInput = { region: string; identityInstanceArn: string; permissionSetArn: string; customIamPolicyNames: string[] };

const attachCustomerManagedPolicyReference =
  (logger: Logger) =>
  ({ region, identityInstanceArn, permissionSetArn, customIamPolicyNames }: AttachCustomerManagedPolicyReferenceInput) => {
    const client = new SSOAdminClient({ region: region });
    const resultAsync = customIamPolicyNames.reduce(
      (accResultAsync, policy) => {
        const command = new AttachCustomerManagedPolicyReferenceToPermissionSetCommand({
          InstanceArn: identityInstanceArn,
          PermissionSetArn: permissionSetArn,
          CustomerManagedPolicyReference: {
            Name: policy,
          },
        });
        return accResultAsync.andThen(() =>
          ResultAsync.fromPromise(client.send(command), (e) => {
            if (e instanceof ConflictException && e.message.includes("already attached")) {
              return new HandlerError("Given customer managed policy already attached.", "INTERNAL_SERVER_ERROR");
            }
            logger.error("Failed to attach custom managed policy", e);
            const message = `Failed to attach custom managed policy: ${(e as Error).message ?? ""}`;
            return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
          }).map(() => undefined)
        );
      },
      ResultAsync.fromPromise(Promise.resolve(undefined), () => new HandlerError("Initial promise failed", "INTERNAL_SERVER_ERROR"))
    );

    return resultAsync;
  };
