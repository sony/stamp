import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { IdentitystoreClient, GetGroupMembershipIdCommand, ResourceNotFoundException } from "@aws-sdk/client-identitystore";

type Config = { region: string; identityStoreId: string };
type ExtendGroupMembershipIdInput = { groupId: string; userId: string };
export type ExtendGroupMembershipId = <T extends ExtendGroupMembershipIdInput>(input: T) => ResultAsync<T & { membershipId: string }, HandlerError>;

export const extendGroupMembershipId =
  (logger: Logger, config: Config): ExtendGroupMembershipId =>
  (input) => {
    const client = new IdentitystoreClient({ region: config.region });
    const command = new GetGroupMembershipIdCommand({
      IdentityStoreId: config.identityStoreId,
      GroupId: input.groupId,
      MemberId: {
        UserId: input.userId,
      },
    });
    return ResultAsync.fromPromise(client.send(command), (e) => {
      if (e instanceof ResourceNotFoundException) {
        return new HandlerError("Group membership not found.", "INTERNAL_SERVER_ERROR");
      }
      logger.error("Failed to get groupMembershipId", e);
      const message = `Failed to get groupMembershipId: ${(e as Error).message ?? ""}`;
      return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
    }).andThen((result) => {
      if (result.MembershipId === undefined) return errAsync(new HandlerError("MembershipId does not exist.", "INTERNAL_SERVER_ERROR"));
      return okAsync(
        structuredClone({
          ...input,
          membershipId: result.MembershipId,
        })
      );
    });
  };
