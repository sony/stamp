import { expect, it, describe, vi, beforeEach } from "vitest";
import { deleteGroup } from "./deleteGroup";
import { DeleteGroupInput } from "./input";
import { ephemeralIdentityPlugin, ephemeralIdentityPluginForAllUserAdmin } from "@stamp-lib/stamp-ephemeral-identity-plugin";
import { IdentityProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
async function setupUserAndGroup(identityProvider: IdentityProvider = ephemeralIdentityPlugin) {
  const createRequestUserResult = await identityProvider.user.create({ userName: "requestUser", email: "user1@example.com" });
  if (createRequestUserResult.isErr()) {
    throw createRequestUserResult.error;
  }

  const createGroupResult = await identityProvider.group.create({ groupName: "group1", description: "test" });
  if (createGroupResult.isErr()) {
    throw createGroupResult.error;
  }

  const requestUserId = createRequestUserResult.value.userId;

  const groupId = createGroupResult.value.groupId;

  return { requestUserId, groupId };
}

describe("deleteGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });
  it("should delete group", async () => {
    // Create user and group
    const { requestUserId, groupId } = await setupUserAndGroup();
    console.log("requestUserId", requestUserId);
    console.log("groupId", groupId);
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: DeleteGroupInput = {
      groupId: groupId,
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await deleteGroup(input, userProvider, groupProvider, groupMemberShipProvider);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
  });

  it("should not delete group if requestUser is not exist", async () => {
    const { groupId } = await setupUserAndGroup();

    const input: DeleteGroupInput = {
      groupId,
      requestUserId: "7ad3193b-028b-45bd-8727-7fd22c940af4", // random uuid
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await deleteGroup(input, userProvider, groupProvider, groupMemberShipProvider);

    expect.assertions(2);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should not delete group if group is not exist", async () => {
    const { requestUserId } = await setupUserAndGroup();

    const input: DeleteGroupInput = {
      groupId: "7ad3193b-028b-45bd-8727-7fd22c940af4", // random uuid
      requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await deleteGroup(input, userProvider, groupProvider, groupMemberShipProvider);

    expect.assertions(2);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should not delete group if requestUser is not owner", async () => {
    const { requestUserId, groupId } = await setupUserAndGroup();
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "member" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: DeleteGroupInput = {
      groupId: groupId,
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await deleteGroup(input, userProvider, groupProvider, groupMemberShipProvider);

    expect.assertions(2);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should delete group if requestUser is admin", async () => {
    const { requestUserId, groupId } = await setupUserAndGroup(ephemeralIdentityPluginForAllUserAdmin);

    const input: DeleteGroupInput = {
      groupId: groupId,
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await deleteGroup(input, userProvider, groupProvider, groupMemberShipProvider);

    expect.assertions(1);
    expect(result.isOk()).toBe(true);
  });
});
