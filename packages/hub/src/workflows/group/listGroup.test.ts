import { expect, it, describe, vi, beforeEach } from "vitest";
import { listGroup } from "./listGroups";
import { ListGroupInput } from "./input";
import { ephemeralIdentityPlugin } from "@stamp-lib/stamp-ephemeral-identity-plugin";

async function setupUser() {
  const createRequestUserResult = await ephemeralIdentityPlugin.user.create({ userName: "requestUser", email: "user1@example.com" });
  if (createRequestUserResult.isErr()) {
    throw createRequestUserResult.error;
  }

  const requestUserId = createRequestUserResult.value.userId;

  return { requestUserId };
}

async function createGroup() {
  const createGroupResult = await ephemeralIdentityPlugin.group.create({ groupName: "group1", description: "test" });
  if (createGroupResult.isErr()) {
    throw createGroupResult.error;
  }

  return createGroupResult.value.groupId;
}

describe("listGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });
  it("should list group", async () => {
    // Create user and group
    const { requestUserId } = await setupUser();
    const groupId = await createGroup();

    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: ListGroupInput = {
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const result = await listGroup(input, userProvider, groupProvider);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
  });

  it("should not list group if requestUser is not exist", async () => {
    const input: ListGroupInput = {
      requestUserId: "7ad3193b-028b-45bd-8727-7fd22c940af4", // random uuid
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const result = await listGroup(input, userProvider, groupProvider);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });
});
