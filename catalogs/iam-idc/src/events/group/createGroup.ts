import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok, okAsync, errAsync } from "neverthrow";
import { IdentitystoreClient, CreateGroupCommand, ListGroupsCommand, ConflictException } from "@aws-sdk/client-identitystore";
import { Logger } from "@stamp-lib/stamp-logger";

type Config = { region: string; identityInstanceArn: string; identityStoreId: string };
type CreateGroupInput = {
  sessionDuration: string;
  managedIamPolicyNames: string[];
  customIamPolicyNames: string[];
  awsAccountId: string;
  groupName: string;
  permissionSetName: string;
  permissionSetArn: string;
};
type CreateGroupOutput = CreateGroupInput & {
  groupId: string;
};
type CreateGroup = <T extends CreateGroupInput>(CreateGroupInput: T) => ResultAsync<CreateGroupOutput, HandlerError>;

export const createGroup =
  (logger: Logger, config: Config): CreateGroup =>
  (input) => {
    return createGroupWithinIdentitystore(logger, {
      region: config.region,
      identityStoreId: config.identityStoreId,
      groupName: input.groupName,
    })
      .andThen((result) => {
        return ok({
          sessionDuration: input.sessionDuration,
          customIamPolicyNames: input.customIamPolicyNames,
          managedIamPolicyNames: input.managedIamPolicyNames,
          awsAccountId: input.awsAccountId,
          groupName: input.groupName,
          permissionSetArn: input.permissionSetArn,
          permissionSetName: input.permissionSetName,
          groupId: result.GroupId,
        });
      })
      .orElse((error) => {
        if (error.message === "Group already exists.") {
          return getGroupIdByGroupName(logger, {
            region: config.region,
            identityStoreId: config.identityStoreId,
            groupName: input.groupName,
          })
            .andThen((result) => {
              return okAsync({
                sessionDuration: input.sessionDuration,
                customIamPolicyNames: input.customIamPolicyNames,
                managedIamPolicyNames: input.managedIamPolicyNames,
                awsAccountId: input.awsAccountId,
                groupName: input.groupName,
                permissionSetArn: input.permissionSetArn,
                permissionSetName: input.permissionSetName,
                groupId: result.GroupId,
              });
            })
            .orElse((error) => {
              return errAsync(error);
            });
        }
        return errAsync(error);
      });
  };

type createGroupWithinIdentitystoreInput = { region: string; identityStoreId: string; groupName: string };

const createGroupWithinIdentitystore = (logger: Logger, { region, identityStoreId, groupName }: createGroupWithinIdentitystoreInput) => {
  const client = new IdentitystoreClient({ region: region });
  const command = new CreateGroupCommand({
    IdentityStoreId: identityStoreId,
    DisplayName: groupName,
  });
  return ResultAsync.fromPromise(client.send(command), (e) => {
    if (e instanceof ConflictException && e.message.includes("Duplicate GroupDisplayName")) {
      return new HandlerError("Group already exists.", "INTERNAL_SERVER_ERROR");
    }
    const message = `Failed to create group: ${e}`;
    logger.error(message);
    return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
  }).andThen((result) => {
    if (!result.GroupId) {
      const message = "Failed to create group. (Could not get groupID)";
      return errAsync(new HandlerError(message, "INTERNAL_SERVER_ERROR", message));
    }
    return ok({
      GroupId: result.GroupId,
    });
  });
};

type GetGroupIdByGroupNameInput = { region: string; identityStoreId: string; groupName: string };

const getGroupIdByGroupName = (logger: Logger, { region, identityStoreId, groupName }: GetGroupIdByGroupNameInput) => {
  const client = new IdentitystoreClient({ region: region });
  const command = new ListGroupsCommand({
    IdentityStoreId: identityStoreId,
    Filters: [
      {
        AttributePath: "DisplayName",
        AttributeValue: groupName,
      },
    ],
  });
  return ResultAsync.fromPromise(client.send(command), (e) => {
    const message = `Failed to list group: ${e}`;
    logger.error(message);
    return new HandlerError(message, "INTERNAL_SERVER_ERROR");
  }).andThen((result) => {
    const matchingGroup = result.Groups?.find((group) => group.GroupId);
    if (matchingGroup && matchingGroup.GroupId) {
      return okAsync({
        GroupId: matchingGroup.GroupId,
      });
    }
    return errAsync(new HandlerError("GroupId does not exist.", "INTERNAL_SERVER_ERROR"));
  });
};
