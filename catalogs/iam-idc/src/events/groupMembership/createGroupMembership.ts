import {
  ConflictException,
  CreateGroupMembershipCommand,
  DescribeGroupMembershipCommand,
  IdentitystoreClient,
  ListGroupMembershipsCommand,
} from "@aws-sdk/client-identitystore";
import { Logger } from "@stamp-lib/stamp-logger";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, err, errAsync, ok } from "neverthrow";
import z from "zod";

export const CreateGroupMembershipInput = z.object({
  userId: z.string(),
  groupId: z.string(),
});
export type CreateGroupMembershipInput = z.infer<typeof CreateGroupMembershipInput>;

export const CreateGroupMembershipOutput = CreateGroupMembershipInput.extend({
  membershipId: z.string(),
});
export type CreateGroupMembershipOutput = z.infer<typeof CreateGroupMembershipOutput>;

type Config = { region: string; identityStoreId: string };
type CreateGroupMembership = (input: CreateGroupMembershipInput) => ResultAsync<CreateGroupMembershipOutput, HandlerError>;

export const createGroupMembership =
  (logger: Logger, config: Config): CreateGroupMembership =>
  (input) => {
    const parsedResult = CreateGroupMembershipInput.safeParse(input);
    if (!parsedResult.success) {
      return errAsync(new HandlerError("Invalid input.", "BAD_REQUEST"));
    }

    const parsedInput = parsedResult.data;

    const client = new IdentitystoreClient({ region: config.region });

    const createResult = (membershipId: string) =>
      ok({
        userId: parsedInput.userId,
        groupId: parsedInput.groupId,
        membershipId: membershipId,
      });

    return createGroupMembershipWithinIdentitystore(logger)(client, {
      identityStoreId: config.identityStoreId,
      groupId: parsedInput.groupId,
      userId: parsedInput.userId,
    })
      .andThen((result) => {
        return createResult(result.membershipId);
      })
      .orElse((error) => {
        if (error.message === "Group relationship already exists.") {
          return getMembershipId(logger)(client, {
            identityStoreId: config.identityStoreId,
            groupId: parsedInput.groupId,
            userId: parsedInput.userId,
          })
            .andThen((result) => {
              return createResult(result.membershipId);
            })
            .orElse((error) => {
              return err(error);
            });
        }
        return err(error);
      });
  };

type CreateGroupMembershipWithinIdentitystoreInput = { identityStoreId: string; groupId: string; userId: string };

const createGroupMembershipWithinIdentitystore =
  (logger: Logger) =>
  (client: IdentitystoreClient, { identityStoreId, groupId, userId }: CreateGroupMembershipWithinIdentitystoreInput) => {
    const command = new CreateGroupMembershipCommand({
      IdentityStoreId: identityStoreId,
      GroupId: groupId,
      MemberId: {
        UserId: userId,
      },
    });
    return ResultAsync.fromPromise(client.send(command), (e) => {
      if (e instanceof ConflictException && e.message.includes("already exists")) {
        return new HandlerError("Group relationship already exists.", "INTERNAL_SERVER_ERROR");
      }
      logger.error("Failed to create groupMembershipId", e);
      const message = `Failed to create groupMembershipId: ${(e as Error).message ?? ""}`;
      return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
    }).andThen((result) => {
      if (!result.MembershipId) {
        const message = "MembershipId does not exist.";
        return err(new HandlerError(message, "INTERNAL_SERVER_ERROR", message));
      }
      return ok({
        membershipId: result.MembershipId,
      });
    });
  };

// There is no API to obtain MembershipId from groupId with userId.
// So, we use ListGroupMembershipsCommand and DescribeGroupMembershipCommand to obtain MembershipId from groupId with userId.
// This implementation may be hit by API call quotas.
// It is rare for createGroupMembership to be called when a Group relationship already exists, so I think there is no problem.
type GetMembershipIdInput = { identityStoreId: string; groupId: string; userId: string };
type GetMembershipIdOutput = { membershipId: string };
const getMembershipId =
  (logger: Logger) =>
  (client: IdentitystoreClient, { identityStoreId, groupId, userId }: GetMembershipIdInput) => {
    const fetchMemberships = (nextToken?: string): ResultAsync<GetMembershipIdOutput, HandlerError> => {
      const command = new ListGroupMembershipsCommand({
        IdentityStoreId: identityStoreId,
        GroupId: groupId,
        MaxResults: 100,
        NextToken: nextToken,
      });

      return ResultAsync.fromPromise(client.send(command), (e) => {
        logger.error("Failed to list Group Memberships", e);
        const message = `Failed to list Group Memberships: ${(e as Error).message ?? ""}`;
        return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
      }).andThen((result) => {
        const promises = (result.GroupMemberships || []).map((groupMembership) => {
          const describeCommand = new DescribeGroupMembershipCommand({
            IdentityStoreId: identityStoreId,
            MembershipId: groupMembership.MembershipId,
          });
          return client.send(describeCommand);
        });
        return ResultAsync.fromPromise(Promise.all(promises), (e) => {
          logger.error("Failed to describe Membership", e);
          const message = `Failed to describe Membership: ${(e as Error).message ?? ""}`;
          return new HandlerError(message, "INTERNAL_SERVER_ERROR", message);
        }).andThen((describeResults) => {
          for (const describeResult of describeResults) {
            if (describeResult.MemberId && describeResult.MemberId.UserId === userId && describeResult.MembershipId) {
              return ok({
                membershipId: describeResult.MembershipId,
              });
            }
          }

          if (result.NextToken) {
            return fetchMemberships(result.NextToken);
          } else {
            const message = "MembershipId does not exist.";
            return err(new HandlerError(message, "INTERNAL_SERVER_ERROR", message));
          }
        });
      });
    };

    return fetchMemberships();
  };
