import { expect, it, describe, vi, beforeEach } from "vitest";
import { checkCanEditGroupImpl } from "./authz";
import { ephemeralIdentityPlugin } from "@stamp-lib/stamp-ephemeral-identity-plugin";
import { createIsGroupOwner } from "./membership";

import { okAsync } from "neverthrow";

async function setupUserAndGroup() {
  const createRequestUserResult = await ephemeralIdentityPlugin.user.create({ userName: "requestUser", email: "user1@example.com" });
  if (createRequestUserResult.isErr()) {
    throw createRequestUserResult.error;
  }
  const createTargetUserResult = await ephemeralIdentityPlugin.user.create({ userName: "targetUser", email: "user2@example.com" });
  if (createTargetUserResult.isErr()) {
    throw createTargetUserResult.error;
  }
  const createGroupResult = await ephemeralIdentityPlugin.group.create({ groupName: "group1", description: "test" });
  if (createGroupResult.isErr()) {
    throw createGroupResult.error;
  }

  const requestUserId = createRequestUserResult.value.userId;
  const targetUserId = createTargetUserResult.value.userId;
  const groupId = createGroupResult.value.groupId;

  return { requestUserId, targetUserId, groupId };
}

describe("checkCanEditGroup", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  it("should return true if requestUser is group owner", async () => {
    // Create user and group
    const { targetUserId, requestUserId, groupId } = await setupUserAndGroup();
    // Add member user to group
    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }

    const input = {
      groupId: groupId,
      targetUserId: targetUserId,
      requestUserId: requestUserId,
    };

    const isGroupOwner = createIsGroupOwner(ephemeralIdentityPlugin.groupMemberShip.get);
    const isAdmin = () => {
      return okAsync(false);
    };

    const result = await checkCanEditGroupImpl(input, isGroupOwner, isAdmin);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toStrictEqual(input);
  });
  it("should return false if requestUser is member", async () => {
    // Create user and group
    const { targetUserId, requestUserId, groupId } = await setupUserAndGroup();
    // Add member user to group
    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "member" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }

    const input = {
      groupId: groupId,
      targetUserId: targetUserId,
      requestUserId: requestUserId,
    };

    const isGroupOwner = createIsGroupOwner(ephemeralIdentityPlugin.groupMemberShip.get);
    const isAdmin = () => {
      return okAsync(false);
    };

    const result = await checkCanEditGroupImpl(input, isGroupOwner, isAdmin);
    expect(result.isOk()).toBe(false);
    if (result.isOk()) {
      throw new Error("test failed");
    }
    expect(result.error.code).toBe("FORBIDDEN");
  });

  it("should return false if requestUser is neither member nor owner", async () => {
    // Create user and group
    const { targetUserId, requestUserId, groupId } = await setupUserAndGroup();

    const input = {
      groupId: groupId,
      targetUserId: targetUserId,
      requestUserId: requestUserId,
    };

    const isGroupOwner = createIsGroupOwner(ephemeralIdentityPlugin.groupMemberShip.get);
    const isAdmin = () => {
      return okAsync(false);
    };

    const result = await checkCanEditGroupImpl(input, isGroupOwner, isAdmin);
    expect(result.isOk()).toBe(false);
    if (result.isOk()) {
      throw new Error("test failed");
    }
    expect(result.error.code).toBe("FORBIDDEN");
  });

  it("should return true if requestUser is admin", async () => {
    // Create user and group
    const { targetUserId, requestUserId, groupId } = await setupUserAndGroup();

    const input = {
      groupId: groupId,
      targetUserId: targetUserId,
      requestUserId: requestUserId,
    };

    const isGroupOwner = createIsGroupOwner(ephemeralIdentityPlugin.groupMemberShip.get);
    const isAdmin = () => {
      return okAsync(true);
    };

    const result = await checkCanEditGroupImpl(input, isGroupOwner, isAdmin);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toStrictEqual(input);
  });
});
