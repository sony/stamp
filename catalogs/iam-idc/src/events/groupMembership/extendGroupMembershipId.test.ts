import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { extendGroupMembershipId } from "./extendGroupMembershipId";
import { createLogger } from "@stamp-lib/stamp-logger";
import { createGroupMembership, CreateGroupMembershipInput } from "./createGroupMembership";
import { deleteGroupMembership } from "./deleteGroupMembership";

describe("extendGroupMembershipId function", () => {
  const identityStoreId: string = process.env.IDENTITY_STORE_ID!;
  const groupId: string = process.env.GROUP_ID!;
  const userId: string = process.env.EXISTING_USER_ID!;
  const userIdNotInGroup: string = process.env.EXISTING_USER_ID_2!;
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const config = {
    region: "us-west-2",
    identityStoreId: identityStoreId,
  };
  let membershipId: string | null = null;

  beforeAll(async () => {
    const input: CreateGroupMembershipInput = {
      groupId: groupId,
      userId: userId,
    };
    const resultAsync = createGroupMembership(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const groupMembership = result.value;
    membershipId = groupMembership.membershipId;
  });

  it("Successful case in extendGroupMembershipId", async () => {
    const input = {
      groupId: groupId,
      userId: userId,
    };
    const expected = {
      groupId: groupId,
      userId: userId,
      membershipId: membershipId,
    };
    const resultAsync = extendGroupMembershipId(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const groupMembership = result.value;
    expect(groupMembership).toEqual(expected);
  });

  it("Group membership is non-existent case", async () => {
    const input = {
      groupId: groupId,
      userId: userIdNotInGroup,
    };
    const resultAsync = extendGroupMembershipId(logger, config)(input);
    const result = await resultAsync;
    if (result.isOk()) {
      throw new Error("Successful completion is not the expected result");
    }
    const errMessage = result._unsafeUnwrapErr().message;
    expect(errMessage).toBe("Group membership not found.");
  });

  afterAll(async () => {
    if (membershipId) {
      await deleteGroupMembership(
        logger,
        config
      )({
        membershipId: membershipId,
      });
      membershipId = null;
    }
  });
});
