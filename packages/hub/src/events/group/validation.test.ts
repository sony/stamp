import { expect, it, describe, vi, beforeEach } from "vitest";

import { validateGroupIdImpl, checkTargetUserInGroupImpl, checkTargetUserNotInGroupImpl, checkDeleteableGroupImpl } from "./validation";
import { ephemeralIdentityPlugin } from "@stamp-lib/stamp-ephemeral-identity-plugin";

async function setupGroup() {
  const createGroupResult = await ephemeralIdentityPlugin.group.create({ groupName: "group1", description: "test" });
  if (createGroupResult.isErr()) {
    throw createGroupResult.error;
  }
  const groupId = createGroupResult.value.groupId;

  const createRequestUserResult = await ephemeralIdentityPlugin.user.create({ userName: "requestUser", email: "user1@example.com" });
  if (createRequestUserResult.isErr()) {
    throw createRequestUserResult.error;
  }
  const requestUserId = createRequestUserResult.value.userId;

  const createTargetUserResult = await ephemeralIdentityPlugin.user.create({ userName: "targetUser", email: "user2@example.com" });
  if (createTargetUserResult.isErr()) {
    throw createTargetUserResult.error;
  }
  const targetUserId = createTargetUserResult.value.userId;

  return { groupId, requestUserId, targetUserId };
}

describe("validateGroup", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return ok if group exist", async () => {
    const { groupId } = await setupGroup();
    const input = { groupId };
    const validateResult = await validateGroupIdImpl(input, ephemeralIdentityPlugin.group);
    expect(validateResult.isOk()).toBe(true);

    if (validateResult.isErr()) {
      throw validateResult.error;
    }
    expect(validateResult.value).toStrictEqual(input);
  });

  it("should return BAD_REQUEST if target group not exist", async () => {
    const input = { groupId: "2852d13a-4239-4dd1-bba6-fc3c8b30ff61" }; // targetUserId is random uuid
    const validateResult = await validateGroupIdImpl(input, ephemeralIdentityPlugin.group);

    expect.assertions(2);
    expect(validateResult.isOk()).toBe(false);
    if (validateResult.isErr()) {
      expect(validateResult.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should return same input param", async () => {
    const { groupId } = await setupGroup();
    const input = { groupId, testParameter: "this is test", testObject: { test: "this is test", num: 123, bool: true, array: [] } };
    const validateResult = await validateGroupIdImpl(input, ephemeralIdentityPlugin.group);

    expect.assertions(2);
    expect(validateResult.isOk()).toBe(true);
    if (validateResult.isOk()) {
      expect(validateResult.value).toStrictEqual(input);
    }
  });
});

describe("checkUserInGroup", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return ok if user member is in group", async () => {
    const { groupId, targetUserId } = await setupGroup();
    const input = { groupId, targetUserId };

    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: targetUserId, role: "member" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }

    const checkResult = await checkTargetUserInGroupImpl(input, ephemeralIdentityPlugin.groupMemberShip);
    expect.assertions(2);
    expect(checkResult.isOk()).toBe(true);
    if (checkResult.isOk()) {
      expect(checkResult.value).toStrictEqual(input);
    }
  });

  it("should return ok if user owner is in group", async () => {
    const { groupId, targetUserId } = await setupGroup();
    const input = { groupId, targetUserId };

    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: targetUserId, role: "owner" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }

    const checkResult = await checkTargetUserInGroupImpl(input, ephemeralIdentityPlugin.groupMemberShip);

    expect.assertions(2);
    expect(checkResult.isOk()).toBe(true);
    if (checkResult.isOk()) {
      expect(checkResult.value).toStrictEqual(input);
    }
  });

  it("should return BAD_REQUEST if user is not in group", async () => {
    const { groupId, targetUserId } = await setupGroup();
    const input = { groupId, targetUserId };
    const checkResult = await checkTargetUserInGroupImpl(input, ephemeralIdentityPlugin.groupMemberShip);

    expect.assertions(2);
    expect(checkResult.isErr()).toBe(true);
    if (checkResult.isErr()) {
      expect(checkResult.error.code).toBe("BAD_REQUEST");
    }
  });
});

describe("checkTargetUserNotInGroup", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return ok if user is not in group", async () => {
    const { groupId, targetUserId } = await setupGroup();
    const input = { groupId, targetUserId };
    const checkResult = await checkTargetUserNotInGroupImpl(input, ephemeralIdentityPlugin.groupMemberShip);

    expect.assertions(2);
    expect(checkResult.isOk()).toBe(true);
    if (checkResult.isOk()) {
      expect(checkResult.value).toStrictEqual(input);
    }
  });

  it("should return BAD_REQUEST if user member is in group", async () => {
    const { groupId, targetUserId } = await setupGroup();
    const input = { groupId, targetUserId };

    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: targetUserId, role: "member" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }

    const checkResult = await checkTargetUserNotInGroupImpl(input, ephemeralIdentityPlugin.groupMemberShip);

    expect.assertions(2);
    expect(checkResult.isErr()).toBe(true);
    if (checkResult.isErr()) {
      expect(checkResult.error.code).toBe("BAD_REQUEST");
    }
  });

  it("should return BAD_REQUEST if user owner is in group", async () => {
    const { groupId, targetUserId } = await setupGroup();
    const input = { groupId, targetUserId };

    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: targetUserId, role: "owner" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }

    const checkResult = await checkTargetUserNotInGroupImpl(input, ephemeralIdentityPlugin.groupMemberShip);

    expect.assertions(2);
    expect(checkResult.isErr()).toBe(true);
    if (checkResult.isErr()) {
      expect(checkResult.error.code).toBe("BAD_REQUEST");
    }
  });
});

describe("checkDeleteableGroup", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return ok if group is deletable", async () => {
    const { groupId, requestUserId } = await setupGroup();
    const input = { groupId, requestUserId };

    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "owner" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }
    const checkResult = await checkDeleteableGroupImpl(input, ephemeralIdentityPlugin.groupMemberShip);

    expect.assertions(2);
    expect(checkResult.isOk()).toBe(true);
    if (checkResult.isOk()) {
      expect(checkResult.value).toStrictEqual(input);
    }
  });

  it("should return BAD_REQUEST if group is not deletable", async () => {
    const { groupId, requestUserId, targetUserId } = await setupGroup();
    const input = { groupId, requestUserId };

    // Set more than one user in group
    const addOtherMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: targetUserId, role: "member" });
    if (addOtherMemberResult.isErr()) {
      throw addOtherMemberResult.error;
    }

    const addMemberResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: requestUserId, role: "member" });
    if (addMemberResult.isErr()) {
      throw addMemberResult.error;
    }

    const checkResult = await checkDeleteableGroupImpl(input, ephemeralIdentityPlugin.groupMemberShip);

    expect.assertions(2);
    expect(checkResult.isErr()).toBe(true);
    if (checkResult.isErr()) {
      expect(checkResult.error.code).toBe("BAD_REQUEST");
    }
  });
});
