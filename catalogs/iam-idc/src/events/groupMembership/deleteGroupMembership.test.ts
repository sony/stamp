import { expect, it, describe, beforeAll } from "vitest";
import { deleteGroupMembership } from "./deleteGroupMembership";
import { createGroupMembership, CreateGroupMembershipInput } from "./createGroupMembership";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("deleteGroupMembership function", () => {
  const identityStoreId: string = process.env.IDENTITY_STORE_ID!;
  const groupId: string = process.env.GROUP_ID!;
  const userId: string = process.env.EXISTING_USER_ID!;
  let membershipId: string | null = null;
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const config = {
    region: "us-west-2",
    identityStoreId: identityStoreId,
  };

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

  it("Successful case in deleteGroupMembership", async () => {
    if (membershipId === null) {
      throw new Error("membershipID is undefined.");
    }
    const input = {
      membershipId: membershipId,
    };

    const resultAsync = deleteGroupMembership(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toEqual(void 0);
  });

  it("Successful case where user and group have already been unlinked", async () => {
    if (membershipId === null) {
      throw new Error("membershipID is undefined.");
    }
    const input = {
      membershipId: membershipId,
    };

    const resultAsync = deleteGroupMembership(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toEqual(void 0);
  });
});
