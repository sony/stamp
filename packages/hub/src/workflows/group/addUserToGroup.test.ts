import { ephemeralIdentityPlugin, ephemeralIdentityPluginForAllUserAdmin } from "@stamp-lib/stamp-ephemeral-identity-plugin";
import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { errAsync, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addUserToGroup } from "./addUserToGroup";
import { AddUserToGroupInput } from "./input";
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

async function setupUserAndGroupWithMemberNotification(identityProvider: IdentityProvider = ephemeralIdentityPlugin) {
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
  await identityProvider.group.createGroupMemberNotification({
    groupId: createGroupResult.value.groupId,
    notificationChannel: { id: "test-channel-id", typeId: "slack", properties: { channelId: "test-channel-id", customMessage: "test-message" } },
  });

  const requestUserId = createRequestUserResult.value.userId;
  const memberUserId = createMemberUserResult.value.userId;
  const groupId = createGroupResult.value.groupId;

  return { requestUserId, memberUserId, groupId };
}

describe("addUserToGroup", () => {
  const logger = createLogger("DEBUG", { moduleName: "hub" });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });
  const getNotificationPluginConfig = vi.fn();
  const mockSendNotification = vi.fn((value) => {
    return okAsync(value);
  });

  it("should add user to group", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroupWithMemberNotification();
    console.log("requestUserId", requestUserId);
    console.log("memberUserId", memberUserId);
    console.log("groupId", groupId);
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: AddUserToGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      role: "member",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    getNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { sendNotification: mockSendNotification } })));
    const result = await addUserToGroup(logger, userProvider, groupProvider, groupMemberShipProvider, getNotificationPluginConfig)(input);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.groupId).toBe(groupId);
    expect(result.value.userId).toBe(memberUserId);
    expect(result.value.role).toBe("member");
  });

  it("check if parameters of sendNotification are correct when add user to group", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroupWithMemberNotification();
    console.log("requestUserId", requestUserId);
    console.log("memberUserId", memberUserId);
    console.log("groupId", groupId);
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: AddUserToGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      role: "member",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    getNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { sendNotification: mockSendNotification } })));
    const result = await addUserToGroup(logger, userProvider, groupProvider, groupMemberShipProvider, getNotificationPluginConfig)(input);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(mockSendNotification).toHaveBeenCalledWith({
      message: {
        type: "GroupMemberAddedEvent",
        property: {
          groupId: groupId,
          groupName: "group1",
          addedUserId: memberUserId,
          addedUserName: "memberUser (email: user2@example.com)",
          timeStamp: expect.any(String),
          requesterUserId: requestUserId,
          requesterUserName: "requestUser (email: user1@example.com)",
        },
      },
      channel: {
        id: "test-channel-id",
        typeId: "slack",
        properties: { channelId: "test-channel-id", customMessage: "test-message" },
      },
    });
  });

  it("should add user to group when no groupMemberNotification is set", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroup();
    console.log("requestUserId", requestUserId);
    console.log("memberUserId", memberUserId);
    console.log("groupId", groupId);
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: AddUserToGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      role: "member",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    getNotificationPluginConfig.mockReturnValue(okAsync(none)); // No setting is required as it will not be called
    const result = await addUserToGroup(logger, userProvider, groupProvider, groupMemberShipProvider, getNotificationPluginConfig)(input);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.groupId).toBe(groupId);
    expect(result.value.userId).toBe(memberUserId);
    expect(result.value.role).toBe("member");
  });

  it("should add user to group when groupMemberNotification is set but notification type ID not found in notification plugin", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroupWithMemberNotification();
    console.log("requestUserId", requestUserId);
    console.log("memberUserId", memberUserId);
    console.log("groupId", groupId);
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: AddUserToGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      role: "member",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    getNotificationPluginConfig.mockReturnValue(okAsync(none)); // notification type ID not found in notification plugin
    const result = await addUserToGroup(logger, userProvider, groupProvider, groupMemberShipProvider, getNotificationPluginConfig)(input);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.groupId).toBe(groupId);
    expect(result.value.userId).toBe(memberUserId);
    expect(result.value.role).toBe("member");
  });

  it("should add user to group when send notification failed", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroupWithMemberNotification();
    console.log("requestUserId", requestUserId);
    console.log("memberUserId", memberUserId);
    console.log("groupId", groupId);
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: AddUserToGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      role: "member",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    getNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { sendNotification: vi.fn().mockReturnValue(errAsync({})) } }))); // Failed send notification
    const result = await addUserToGroup(logger, userProvider, groupProvider, groupMemberShipProvider, getNotificationPluginConfig)(input);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.groupId).toBe(groupId);
    expect(result.value.userId).toBe(memberUserId);
    expect(result.value.role).toBe("member");
  });

  it("should not add user to group if user not found", async () => {
    // Create user and group
    const { requestUserId, groupId } = await setupUserAndGroupWithMemberNotification();
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: AddUserToGroupInput = {
      groupId: groupId,
      targetUserId: "63c10a34-7a50-401e-b657-46799cf39f8f", //random uuid
      role: "member",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    getNotificationPluginConfig.mockReturnValue(okAsync(none)); // No setting is required as it will not be called
    const result = await addUserToGroup(logger, userProvider, groupProvider, groupMemberShipProvider, getNotificationPluginConfig)(input);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should not add user to group if group not found", async () => {
    // Create user and group
    const { requestUserId, memberUserId } = await setupUserAndGroupWithMemberNotification();
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({
      groupId: "63c10a34-7a50-401e-b657-46799cf39f8f",
      userId: requestUserId,
      role: "owner",
    });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: AddUserToGroupInput = {
      groupId: "e24eb936-3b4e-4245-8c53-9a10b1a6d13b", //random uuid
      targetUserId: memberUserId,
      role: "member",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    getNotificationPluginConfig.mockReturnValue(okAsync(none)); // No setting is required as it will not be called
    const result = await addUserToGroup(logger, userProvider, groupProvider, groupMemberShipProvider, getNotificationPluginConfig)(input);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should not add user to group if request user is not owner", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroupWithMemberNotification();

    const input: AddUserToGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      role: "member",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    getNotificationPluginConfig.mockReturnValue(okAsync(none)); // No setting is required as it will not be called
    const result = await addUserToGroup(logger, userProvider, groupProvider, groupMemberShipProvider, getNotificationPluginConfig)(input);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should not add user to group if request user is member not owner", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroupWithMemberNotification();
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "member" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }

    const input: AddUserToGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      role: "member",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    getNotificationPluginConfig.mockReturnValue(okAsync(none)); // No setting is required as it will not be called
    const result = await addUserToGroup(logger, userProvider, groupProvider, groupMemberShipProvider, getNotificationPluginConfig)(input);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should not add user to group if user already in group", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroupWithMemberNotification();
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }
    // Add member user to group
    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: memberUserId, role: "member" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }

    const input: AddUserToGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      role: "member",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    getNotificationPluginConfig.mockReturnValue(okAsync(none)); // No setting is required as it will not be called
    const result = await addUserToGroup(logger, userProvider, groupProvider, groupMemberShipProvider, getNotificationPluginConfig)(input);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should not add user to group if group member ship limit reached", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroupWithMemberNotification();
    // Set direct permission for request user
    const setPermissionResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (setPermissionResult.isErr()) {
      throw setPermissionResult.error;
    }
    // Add member user to group
    for (let i = 0; i < 1000; i++) {
      const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: memberUserId + i, role: "member" });
      if (addMemberResult.isErr()) {
        throw addMemberResult.error;
      }
    }

    const input: AddUserToGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      role: "member",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    getNotificationPluginConfig.mockReturnValue(okAsync(none)); // No setting is required as it will not be called
    const result = await addUserToGroup(logger, userProvider, groupProvider, groupMemberShipProvider, getNotificationPluginConfig)(input);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should add user to group if request user is admin", async () => {
    // Create user and group
    const { requestUserId, memberUserId, groupId } = await setupUserAndGroupWithMemberNotification(ephemeralIdentityPluginForAllUserAdmin);

    const input: AddUserToGroupInput = {
      groupId: groupId,
      targetUserId: memberUserId,
      role: "member",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPluginForAllUserAdmin.user;
    const groupProvider = ephemeralIdentityPluginForAllUserAdmin.group;
    const groupMemberShipProvider = ephemeralIdentityPluginForAllUserAdmin.groupMemberShip;
    getNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { sendNotification: mockSendNotification } })));
    const result = await addUserToGroup(logger, userProvider, groupProvider, groupMemberShipProvider, getNotificationPluginConfig)(input);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.groupId).toBe(groupId);
    expect(result.value.userId).toBe(memberUserId);
    expect(result.value.role).toBe("member");
  });
});
