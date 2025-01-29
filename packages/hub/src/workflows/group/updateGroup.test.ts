import { expect, it, describe, vi, beforeEach } from "vitest";
import { updateGroup } from "./updateGroup";
import { UpdateGroupInput } from "./input";
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

describe("updateGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });
  it("should update group", async () => {
    // Create user and group
    const { requestUserId, groupId } = await setupUserAndGroup();
    console.log("requestUserId", requestUserId);
    console.log("groupId", groupId);
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: UpdateGroupInput = {
      groupId: groupId,
      groupName: "group2",
      description: "test2",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await updateGroup(input, userProvider, groupProvider, groupMemberShipProvider);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
  });

  it("should not update group if requestUser is not exist", async () => {
    const { groupId } = await setupUserAndGroup();

    const input: UpdateGroupInput = {
      groupId,
      groupName: "group2",
      description: "test2",
      requestUserId: "7ad3193b-028b-45bd-8727-7fd22c940af4", // random uuid
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await updateGroup(input, userProvider, groupProvider, groupMemberShipProvider);
    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw result.value;
    }
  });

  it("should not update group if group is not exist", async () => {
    const { requestUserId } = await setupUserAndGroup();

    const input: UpdateGroupInput = {
      groupId: "7ad3193b-028b-45bd-8727-7fd22c940af4", // random uuid
      groupName: "group2",
      description: "test2",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await updateGroup(input, userProvider, groupProvider, groupMemberShipProvider);
    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw result.value;
    }
  });

  it("should not update group if requestUser is not owner", async () => {
    const { requestUserId, groupId } = await setupUserAndGroup();

    const input: UpdateGroupInput = {
      groupId,
      groupName: "group2",
      description: "test2",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await updateGroup(input, userProvider, groupProvider, groupMemberShipProvider);
    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw result.value;
    }
  });

  it("should not update group if requestUser is member", async () => {
    const { requestUserId, groupId } = await setupUserAndGroup();
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "member" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: UpdateGroupInput = {
      groupId,
      groupName: "group2",
      description: "test2",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await updateGroup(input, userProvider, groupProvider, groupMemberShipProvider);
    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw result.value;
    }
  });

  it("should update group if requestUser is admin", async () => {
    const { requestUserId, groupId } = await setupUserAndGroup(ephemeralIdentityPluginForAllUserAdmin);

    const input: UpdateGroupInput = {
      groupId,
      groupName: "group2",
      description: "test2",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await updateGroup(input, userProvider, groupProvider, groupMemberShipProvider);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
  });
});
