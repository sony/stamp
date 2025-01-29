import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok } from "neverthrow";
import { IdentitystoreClient, DeleteGroupCommand } from "@aws-sdk/client-identitystore";
import { Logger } from "@stamp-lib/stamp-logger";

type Config = { region: string; identityStoreId: string };
type DeleteGroupInput = { groupId: string };
type DeleteGroup = <T extends DeleteGroupInput>(input: T) => ResultAsync<T, HandlerError>;

export const deleteGroup =
  (logger: Logger, config: Config): DeleteGroup =>
  (input) => {
    const client = new IdentitystoreClient({ region: config.region });
    const command = new DeleteGroupCommand({
      IdentityStoreId: config.identityStoreId,
      GroupId: input.groupId,
    });
    return ResultAsync.fromPromise(client.send(command), (e) => {
      const message = `Failed to delete group: ${e}`;
      logger.error(message);
      return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
    }).andThen(() => {
      return ok(input);
    });
  };
