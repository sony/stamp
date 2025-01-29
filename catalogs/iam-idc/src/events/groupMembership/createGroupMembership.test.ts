import { expect, it, describe, afterAll } from "vitest";
import { createGroupMembership, CreateGroupMembershipInput, CreateGroupMembershipOutput } from "./createGroupMembership";
import { IdentitystoreClient, DeleteGroupMembershipCommand } from "@aws-sdk/client-identitystore";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("createGroupMembership function", () => {
  const identityStoreId: string = process.env.IDENTITY_STORE_ID!;
  const groupId: string = process.env.GROUP_ID!;
  const userId: string = process.env.EXISTING_USER_ID!;
  let membershipId: string | null = null;
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const config = {
    region: "us-west-2",
    identityStoreId: identityStoreId,
  };

  it("Successful case in createGroupMembership", async () => {
    const input: CreateGroupMembershipInput = {
      groupId: groupId,
      userId: userId,
    };
    const expected: CreateGroupMembershipOutput = {
      groupId: groupId,
      userId: userId,
      membershipId: expect.any(String),
    };

    const resultAsync = createGroupMembership(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const groupMembership = result.value;
    if (groupMembership.membershipId === undefined) {
      throw new Error("membershipID is undefined after group membership creation.");
    }
    expect(groupMembership).toEqual(expected);
    membershipId = groupMembership.membershipId;
  });

  it("Successful case where user and group have already been linked", async () => {
    const input: CreateGroupMembershipInput = {
      groupId: groupId,
      userId: userId,
    };
    const expected: CreateGroupMembershipOutput = {
      groupId: groupId,
      userId: userId,
      membershipId: expect.any(String),
    };

    const resultAsync = createGroupMembership(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const groupMembership = result.value;
    expect(groupMembership).toEqual(expected);
  });

  afterAll(async () => {
    if (membershipId) {
      await deleteGroupMembership(identityStoreId, membershipId);
      membershipId = null;
    }
  });
});

export const deleteGroupMembership: (identityStoreId: string, membershipId: string) => Promise<void> = async (identityStoreId, membershipId) => {
  const region: string = "us-west-2";
  const client = new IdentitystoreClient({ region: region });
  const command = new DeleteGroupMembershipCommand({
    IdentityStoreId: identityStoreId,
    MembershipId: membershipId,
  });
  await client.send(command);
};
