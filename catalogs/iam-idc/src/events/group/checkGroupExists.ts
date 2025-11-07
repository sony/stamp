import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { IdentitystoreClient, ListGroupsCommand } from "@aws-sdk/client-identitystore";
import { Logger } from "@stamp-lib/stamp-logger";

type Config = { region: string; identityStoreId: string };
type CheckGroupExistsInput = {
  groupName: string;
  permissionId: string;
};

/**
 * Error type for group existence check operations
 */
export class GroupExistsError extends Error {
  readonly type: "GroupAlreadyExists" | "ListGroupsFailed";
  readonly groupName: string;
  readonly details?: string;

  constructor(type: "GroupAlreadyExists" | "ListGroupsFailed", groupName: string, message: string, details?: string) {
    super(message);
    this.name = "GroupExistsError";
    this.type = type;
    this.groupName = groupName;
    this.details = details;
    Object.setPrototypeOf(this, GroupExistsError.prototype);
  }
}

type CheckGroupExists = (input: CheckGroupExistsInput) => ResultAsync<CheckGroupExistsInput, GroupExistsError>;

/**
 * Check if a group with the given name already exists in IAM Identity Center.
 * This check is case-insensitive because IAM IdC treats group names case-insensitively.
 * If a group exists, returns an error to prevent multiple permissions from sharing the same group.
 */
export const checkGroupExists =
  (logger: Logger, config: Config): CheckGroupExists =>
  (input) => {
    const client = new IdentitystoreClient({ region: config.region });
    const command = new ListGroupsCommand({
      IdentityStoreId: config.identityStoreId,
      Filters: [
        {
          AttributePath: "DisplayName",
          AttributeValue: input.groupName,
        },
      ],
    });

    return ResultAsync.fromPromise(client.send(command), (e) => {
      const message = `Failed to list groups: ${e}`;
      logger.error(message);
      return new GroupExistsError("ListGroupsFailed", input.groupName, message, String(e));
    }).andThen((result) => {
      const matchingGroup = result.Groups?.find((group) => group.GroupId);
      if (matchingGroup) {
        const message = `Group "${input.groupName}" already exists. Please use a different Permission Set Name Id to avoid conflicts. Note: IAM Identity Center treats group names as case-insensitive.`;
        logger.error(message);
        return errAsync(new GroupExistsError("GroupAlreadyExists", input.groupName, message));
      }
      return okAsync(input);
    });
  };
