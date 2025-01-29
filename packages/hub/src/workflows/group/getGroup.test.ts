import { expect, it, describe, vi, beforeEach } from "vitest";
import { getGroup } from "./getGroup";
import { GetGroupInput } from "./input";
import { ephemeralIdentityPlugin } from "@stamp-lib/stamp-ephemeral-identity-plugin";

async function setupUserAndGroup() {
  const createRequestUserResult = await ephemeralIdentityPlugin.user.create({ userName: "requestUser", email: "user1@example.com" });
  if (createRequestUserResult.isErr()) {
    throw createRequestUserResult.error;
  }

  const createGroupResult = await ephemeralIdentityPlugin.group.create({ groupName: "group1", description: "test" });
  if (createGroupResult.isErr()) {
    throw createGroupResult.error;
  }

  const requestUserId = createRequestUserResult.value.userId;

  const groupId = createGroupResult.value.groupId;

  return { requestUserId, groupId };
}

describe("getGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });
  it("should get group", async () => {
    // Create user and group
    const { requestUserId, groupId } = await setupUserAndGroup();
    console.log("requestUserId", requestUserId);
    console.log("groupId", groupId);
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: GetGroupInput = {
      groupId: groupId,
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const result = await getGroup(input, userProvider, groupProvider);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
  });

  it("should not get group if requestUser is not exist", async () => {
    const { groupId } = await setupUserAndGroup();

    const input: GetGroupInput = {
      groupId,
      requestUserId: "7ad3193b-028b-45bd-8727-7fd22c940af4", // random uuid
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const result = await getGroup(input, userProvider, groupProvider);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should return option's none if group is not exist", async () => {
    const { requestUserId } = await setupUserAndGroup();

    const input: GetGroupInput = {
      groupId: "7ad3193b-028b-45bd-8727-7fd22c940af4", // random uuid
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const result = await getGroup(input, userProvider, groupProvider);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.isNone()).toBe(true);
  });
});
