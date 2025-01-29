import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import {
  SSOAdminClient,
  AttachManagedPolicyToPermissionSetCommand,
  ConflictException,
  ResourceNotFoundException,
  ValidationException,
} from "@aws-sdk/client-sso-admin";

type Config = { region: string; identityInstanceArn: string };
type AttachManagedPolicyInput = { managedIamPolicyNames: Array<string>; permissionSetArn: string };
type AttachManagedPolicy = <T extends AttachManagedPolicyInput>(input: T) => ResultAsync<T, HandlerError>;

export const attachManagedPolicy =
  (logger: Logger, config: Config): AttachManagedPolicy =>
  (input) => {
    const client = new SSOAdminClient({ region: config.region });

    const attachedManagedPolicies = async () => {
      for (const policyName of input.managedIamPolicyNames) {
        const policyArn = `arn:aws:iam::aws:policy/${policyName}`;
        const command = new AttachManagedPolicyToPermissionSetCommand({
          InstanceArn: config.identityInstanceArn,
          PermissionSetArn: input.permissionSetArn,
          ManagedPolicyArn: policyArn,
        });
        try {
          logger.debug(`Attaching managed policy ${policyArn} to permission set ${input.permissionSetArn}`);
          await client.send(command);
        } catch (e) {
          // error message may change in the future. At 2024/01/16, the error message is "Permission set with id <permissionSet Id> already has a typed link attachment to a manged policy with arn:aws:iam::aws:policy/<Policy Name>"
          if (e instanceof ConflictException && e.message.includes("already has a typed link attachment to a manged policy")) {
            logger.debug(`${input.permissionSetArn} already has a typed link attachment to a manged policy ${policyArn}`);
            continue;
          }
          logger.error(e);
          throw e;
        }
      }
    };

    return ResultAsync.fromPromise(attachedManagedPolicies(), (err) => err)
      .map(() => input)
      .orElse((err) => {
        // error message may change in the future. At 2024/01/16, the error message is "Policy does not exist with ARN: arn:aws:iam::aws:policy/non-existent-policy"
        if (err instanceof ResourceNotFoundException && err.message.includes("Policy does not exist")) {
          // notify to user that Policy does not exist.
          return errAsync(new HandlerError(err.message, "BAD_REQUEST", err.message));
        }

        // error message may change in the future. At 2024/01/16, the error message is "Given managed policy ARN: arn:aws:iam::aws:policy/invalid policy, is invalid"
        if (err instanceof ValidationException && err.message.includes("Given managed policy ARN")) {
          // notify to user that Policy is invalid.
          return errAsync(new HandlerError(err.message, "BAD_REQUEST", err.message));
        }

        return errAsync(new HandlerError((err as Error).message ?? "Internal Server Error", "INTERNAL_SERVER_ERROR"));
      });
  };
