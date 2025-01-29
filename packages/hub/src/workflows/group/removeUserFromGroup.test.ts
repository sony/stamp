import { expect, it, describe, vi, beforeEach } from "vitest";
import { removeUserFromGroup } from "./removeUserFromGroup";
import { RemoveUserFromGroupInput } from "./input";
import { ephemeralIdentityPlugin, ephemeralIdentityPluginForAllUserAdmin } from "@stamp-lib/stamp-ephemeral-identity-plugin";
import { IdentityProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";

async function setupUserAndGroup(identityProvider: IdentityProvider = ephemeralIdentityPlugin) {
  const createRequestUserResult = await identityProvider.user.create({ userName: "requestUser", email: "user1@example.com" });
  if (createRequestUserResult.isErr()) {
    throw createRequestUserResult.error;
  }
  const createMemberUserResult = await identityProvider.user.create({ userName: "memberUser", email: "user2@example.com" });
  if (createMemberUserResult.isErr()) {
    throw createMemberUserResult.error;
  }
  const createGroupResult = await identityProvider.group.create({ groupName: "group1", description: "test" });
  if (createGroupResult.isErr()) {
    throw createGroupResult.error;
  }

  const requestUserId = createRequestUserResult.value.userId;
  const memberUserId = createMemberUserResult.value.userId;
  const groupId = createGroupResult.value.groupId;

  return { requestUserId, memberUserId, groupId };
}

describe("removeUserFromGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("should not remove member user from group even if by self", async () => {
    // Create user and group
    const { memberUserId, groupId } = await setupUserAndGroup();
    // Add member user to group
    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: memberUserId, role: "member" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }

    const input: RemoveUserFromGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      requestUserId: memberUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await removeUserFromGroup(input, userProvider, groupProvider, groupMemberShipProvider);

    expect.assertions(2);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });
  it("should remove user from group by group owner", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroup();
    // Add member user to group
    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: memberUserId, role: "member" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }
    const addOwnerResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (addOwnerResult.isErr()) {
      throw addOwnerResult.error;
    }
    const input: RemoveUserFromGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await removeUserFromGroup(input, userProvider, groupProvider, groupMemberShipProvider);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
  });

  it("should not remove user from group if user not found", async () => {
    // Create user and group
    const { requestUserId, groupId } = await setupUserAndGroup();

    const input: RemoveUserFromGroupInput = {
      groupId: groupId,
      targetUserId: "63c10a34-7a50-401e-b657-46799cf39f8f", //random uuid
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await removeUserFromGroup(input, userProvider, groupProvider, groupMemberShipProvider);

    expect.assertions(2);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should not remove user from group if group not found", async () => {
    // Create user and group
    const { requestUserId, memberUserId } = await setupUserAndGroup();

    const input: RemoveUserFromGroupInput = {
      groupId: "e24eb936-3b4e-4245-8c53-9a10b1a6d13b", //random uuid
      targetUserId: memberUserId,
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await removeUserFromGroup(input, userProvider, groupProvider, groupMemberShipProvider);

    expect.assertions(2);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should not remove user from group if request user is not owner", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroup();
    // Add member user to group
    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: memberUserId, role: "member" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }

    const input: RemoveUserFromGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      requestUserId: requestUserId, // request user is not owner
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await removeUserFromGroup(input, userProvider, groupProvider, groupMemberShipProvider);

    expect.assertions(2);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should not remove user from group if request user is member", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroup();
    // Add member user to group
    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: memberUserId, role: "member" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }
    const addRequesterResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "member" });
    if (addRequesterResult.isErr()) {
      throw addRequesterResult.error;
    }

    const input: RemoveUserFromGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      requestUserId: requestUserId, // request user is not owner
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await removeUserFromGroup(input, userProvider, groupProvider, groupMemberShipProvider);

    expect.assertions(2);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should not remove user from group if user is not in group", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroup();

    // Add requestUser to group as owner
    const addOwnerResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (addOwnerResult.isErr()) {
      throw addOwnerResult.error;
    }

    const input: RemoveUserFromGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await removeUserFromGroup(input, userProvider, groupProvider, groupMemberShipProvider);

    expect.assertions(2);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should remove user if request user is admin", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroup(ephemeralIdentityPluginForAllUserAdmin);
    // Add member user to group
    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: memberUserId, role: "member" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }

    const input: RemoveUserFromGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      requestUserId: requestUserId, // request user is not owner
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;

    const result = await removeUserFromGroup(input, userProvider, groupProvider, groupMemberShipProvider);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
  });
});
