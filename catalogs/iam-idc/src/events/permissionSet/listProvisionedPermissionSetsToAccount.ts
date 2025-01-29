import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok } from "neverthrow";
import { SSOAdminClient, ListPermissionSetsProvisionedToAccountCommand, DescribePermissionSetCommand } from "@aws-sdk/client-sso-admin";
import { ListPermissionSetOutput, ListPermissionSetItem } from "../../types/permissionSet";
import { Logger } from "@stamp-lib/stamp-logger";

type Config = { region: string; identityInstanceArn: string };
export type ListProvisionedPermissionSetsToAccountInput = { accountId: string };
type ListProvisionedPermissionSetsToAccount = (input: ListProvisionedPermissionSetsToAccountInput) => ResultAsync<ListPermissionSetOutput, HandlerError>;

export const listProvisionedPermissionSetsToAccount =
  (logger: Logger, config: Config): ListProvisionedPermissionSetsToAccount =>
  (input) => {
    const permissionSetItems: ListPermissionSetItem[] = [];
    const client = new SSOAdminClient({ region: config.region });
    const listProvisionedPermissionSetsToAccountImpl = (nextToken?: string): ResultAsync<ListPermissionSetOutput, HandlerError> => {
      const command = new ListPermissionSetsProvisionedToAccountCommand({
        InstanceArn: config.identityInstanceArn,
        AccountId: input.accountId,
        ProvisioningStatus: "LATEST_PERMISSION_SET_PROVISIONED",
        MaxResults: 100,
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
        return ResultAsync.fromPromise(Promise.all(promises), (e) => {
          const errMessage = `Failed to describe permission sets: ${e}`;
          logger.error(errMessage);
          return new HandlerError(errMessage, "INTERNAL_SERVER_ERROR");
        }).andThen((describeResults) => {
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
            return listProvisionedPermissionSetsToAccountImpl(result.NextToken);
          } else {
            return ok({
              identityInstanceArn: config.identityInstanceArn,
              permissionSets: permissionSetItems,
            });
          }
        });
      });
    };

    return listProvisionedPermissionSetsToAccountImpl();
  };
