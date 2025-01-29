import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, ok } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { IdentitystoreClient, DeleteGroupMembershipCommand } from "@aws-sdk/client-identitystore";

type Config = { region: string; identityStoreId: string };
type DeleteGroupMembershipInput = { membershipId: string };
type DeleteGroupMembership = (input: DeleteGroupMembershipInput) => ResultAsync<void, HandlerError>;

export const deleteGroupMembership =
  (logger: Logger, config: Config): DeleteGroupMembership =>
  (input) => {
    const client = new IdentitystoreClient({ region: config.region });
    const command = new DeleteGroupMembershipCommand({
      IdentityStoreId: config.identityStoreId,
      MembershipId: input.membershipId,
    });
    return ResultAsync.fromPromise(client.send(command), (e) => {
      logger.error("Failed to delete groupMembershipId", e);
      const message = `Failed to delete groupMembershipId: ${(e as Error).message ?? ""}`;
      return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
    }).andThen(
      //TODO: return error only if already deleted groupMembership.
      () => ok(undefined)
    );
  };
