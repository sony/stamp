import { DescribePermissionSetCommand, ListPermissionSetsCommand, SSOAdminClient } from "@aws-sdk/client-sso-admin";
import { Logger } from "@stamp-lib/stamp-logger";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok } from "neverthrow";
import { ListPermissionSetItem, ListPermissionSetOutput } from "../../types/permissionSet";

type Config = { region: string; identityInstanceArn: string };
type ListPermissionSets = () => ResultAsync<ListPermissionSetOutput, HandlerError>;

export const listPermissionSets =
  (logger: Logger, config: Config): ListPermissionSets =>
  () => {
    const permissionSetItems: ListPermissionSetItem[] = [];
    const client = new SSOAdminClient({ region: config.region });
    const listPermissionSetsImpl = (nextToken?: string): ResultAsync<ListPermissionSetOutput, HandlerError> => {
      const command = new ListPermissionSetsCommand({
        InstanceArn: config.identityInstanceArn,
        MaxResults: 10, // IAM Identity Center APIs have a collective throttle maximum of 20 transactions per second(TPS).
        NextToken: nextToken,
      });

      return ResultAsync.fromPromise(client.send(command), (e) => {
        const errMessage = `Failed to list permission sets: ${e}`;
        logger.error(errMessage);
        return new HandlerError(errMessage, "INTERNAL_SERVER_ERROR");
      }).andThen((result) => {
        const promises = (result.PermissionSets || []).map((arn) => {
          const describeCommand = new DescribePermissionSetCommand({
            InstanceArn: config.identityInstanceArn,
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
            const errMessage = `Failed to describe permission sets: ${e}`;
            logger.error(errMessage);
            return new HandlerError(errMessage, "INTERNAL_SERVER_ERROR");
          }
        ).andThen((describeResults) => {
          for (const describeResult of describeResults) {
            if (!describeResult.PermissionSet) {
              continue;
            }
            const item: ListPermissionSetItem = {
              name: describeResult.PermissionSet?.Name || "",
              permissionSetArn: describeResult.PermissionSet?.PermissionSetArn || "",
            };
            permissionSetItems.push(item);
          }

          if (result.NextToken) {
            return listPermissionSetsImpl(result.NextToken);
          } else {
            return ok({
              identityInstanceArn: config.identityInstanceArn,
              permissionSets: permissionSetItems,
            });
          }
        });
      });
    };

    return listPermissionSetsImpl();
  };
