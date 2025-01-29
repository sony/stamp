import {
  ConflictException,
  CreatePermissionSetCommand,
  DescribePermissionSetCommand,
  ListPermissionSetsCommand,
  SSOAdminClient,
} from "@aws-sdk/client-sso-admin";
import { Logger } from "@stamp-lib/stamp-logger";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, err, ok } from "neverthrow";

type Config = { region: string; identityInstanceArn: string };
type CreatePermissionSetInput = {
  sessionDuration: string;
  managedIamPolicyNames: string[];
  customIamPolicyNames: string[];
  awsAccountId: string;
  permissionId: string;
};
type CreatePermissionSetOutput = {
  sessionDuration: string;
  managedIamPolicyNames: string[];
  customIamPolicyNames: string[];
  awsAccountId: string;
  groupName: string;
  permissionSetName: string;
  permissionSetArn: string;
};
export type CreatePermissionSet = <T extends CreatePermissionSetInput>(input: T) => ResultAsync<CreatePermissionSetOutput, HandlerError>;

export const createPermissionSet =
  (logger: Logger, config: Config): CreatePermissionSet =>
  (input) => {
    const createResult = (permissionSetArn: string) =>
      ok({
        sessionDuration: input.sessionDuration,
        managedIamPolicyNames: input.managedIamPolicyNames,
        customIamPolicyNames: input.customIamPolicyNames,
        awsAccountId: input.awsAccountId,
        groupName: input.permissionId,
        permissionSetName: input.permissionId,
        permissionSetArn: permissionSetArn,
      });

    return createPermissionSetWithinIamIdentityCenter(logger)({
      region: config.region,
      identityInstanceArn: config.identityInstanceArn,
      permissionSetName: input.permissionId,
      sessionDuration: input.sessionDuration,
    })
      .andThen((result) => {
        return createResult(result.permissionSetArn);
      })
      .orElse((error) => {
        if (error.message === "PermissionSet already exists.") {
          return getPermissionSetArnByName(logger, {
            region: config.region,
            identityInstanceArn: config.identityInstanceArn,
            permissionSetName: input.permissionId,
          })
            .andThen((result) => {
              return createResult(result.permissionSetArn);
            })
            .orElse((error) => {
              return err(error);
            });
        }
        return err(error);
      });
  };

type CreatePermissionSetWithinIamIdentityCenterInput = { region: string; identityInstanceArn: string; permissionSetName: string; sessionDuration: string };

const createPermissionSetWithinIamIdentityCenter =
  (logger: Logger) =>
  ({ region, identityInstanceArn, permissionSetName, sessionDuration }: CreatePermissionSetWithinIamIdentityCenterInput) => {
    const client = new SSOAdminClient({ region: region });
    const command = new CreatePermissionSetCommand({
      InstanceArn: identityInstanceArn,
      Name: permissionSetName,
      SessionDuration: sessionDuration,
    });
    return ResultAsync.fromPromise(client.send(command), (e) => {
      if (e instanceof ConflictException && e.message.includes("already exists.")) {
        return new HandlerError("PermissionSet already exists.", "INTERNAL_SERVER_ERROR");
      }
      logger.error("Failed to create permission", e);
      const message = `Failed to create permission: ${(e as Error).message ?? ""}`;
      return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
    }).andThen((result) => {
      if (!result.PermissionSet || !result.PermissionSet.PermissionSetArn) {
        const message = "Failed to create permission. (Could not get PermissionSetArn)";
        return err(new HandlerError(message, "INTERNAL_SERVER_ERROR", message));
      }
      return ok({
        permissionSetArn: result.PermissionSet.PermissionSetArn,
      });
    });
  };

// There is no API to obtain ARN from Name of PermissionSet.
// So, we use ListPermissionSetsCommand and DescribePermissionSetCommand to obtain ARN from Name of PermissionSet.
// This implementation may be hit by API call quotas.
// It is rare for createPermissionSet to be called when a PermissionSet already exists, so I think there is no problem.
type GetPermissionSetInput = { region: string; identityInstanceArn: string; permissionSetName: string };
type GetPermissionSetOutput = { permissionSetArn: string };
const getPermissionSetArnByName = (logger: Logger, { region, identityInstanceArn, permissionSetName }: GetPermissionSetInput) => {
  const client = new SSOAdminClient({ region: region });
  const fetchPermissionSetArn = (nextToken?: string): ResultAsync<GetPermissionSetOutput, HandlerError> => {
    const command = new ListPermissionSetsCommand({
      InstanceArn: identityInstanceArn,
      MaxResults: 10, // IAM Identity Center APIs have a collective throttle maximum of 20 transactions per second(TPS).
      NextToken: nextToken,
    });

    return ResultAsync.fromPromise(client.send(command), (e) => {
      const message = `Failed to list permission sets: ${e}`;
      logger.error(message);
      return new HandlerError(message, "INTERNAL_SERVER_ERROR");
    }).andThen((result) => {
      const promises = (result.PermissionSets || []).map((arn) => {
        const describeCommand = new DescribePermissionSetCommand({
          InstanceArn: identityInstanceArn,
          PermissionSetArn: arn,
        });
        return client.send(describeCommand);
      });

      return ResultAsync.fromPromise(
        (async () => {
          // Sleep for 1 second to avoid API call quotas.
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return await Promise.all(promises);
        })(),
        (e) => {
          const message = `Failed to describe permission sets: ${e}`;
          logger.error(message);
          return new HandlerError(message, "INTERNAL_SERVER_ERROR");
        }
      ).andThen((describeResults) => {
        for (const describeResult of describeResults) {
          if (describeResult.PermissionSet && describeResult.PermissionSet?.Name === permissionSetName && describeResult.PermissionSet.PermissionSetArn) {
            return ok({
              permissionSetArn: describeResult.PermissionSet.PermissionSetArn,
            });
          }
        }

        if (result.NextToken) {
          return fetchPermissionSetArn(result.NextToken);
        } else {
          return err(new HandlerError("PermissionSet does not exist.", "INTERNAL_SERVER_ERROR"));
        }
      });
    });
  };

  return fetchPermissionSetArn();
};
