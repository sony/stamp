import { expect, it, describe, vi, beforeEach } from "vitest";
import { listGroupMemberShipByGroup } from "./listGroupMemberShipByGroup";
import { ListGroupMemberShipByGroupInput } from "./input";
import { ephemeralIdentityPlugin } from "@stamp-lib/stamp-ephemeral-identity-plugin";

async function createUser() {
  const createUserResult = await ephemeralIdentityPlugin.user.create({ userName: "requestUser", email: "user1@example.com" });
  if (createUserResult.isErr()) {
    throw createUserResult.error;
  }
  const userId = createUserResult.value.userId;
  return userId;
}

async function createGroup() {
  const createGroupResult = await ephemeralIdentityPlugin.group.create({ groupName: "group1", description: "test" });
  if (createGroupResult.isErr()) {
    throw createGroupResult.error;
  }

  return createGroupResult.value.groupId;
}

async function addUserToGroup(groupId: string, userId: string) {
  const addGroupMemberShipResult = await ephemeralIdentityPlugin.groupMemberShip.create({ groupId: groupId, userId: userId, role: "owner" });
  if (addGroupMemberShipResult.isErr()) {
    throw addGroupMemberShipResult.error;
  }
}

describe("listGroupMemberShipByGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });
  it("should list group member ship by group", async () => {
    const requestUserId = await createUser();
    const groupId = await createGroup();
    const user1 = await createUser();
    const user2 = await createUser();

    await addUserToGroup(groupId, user1);
    await addUserToGroup(groupId, user2);

    const input: ListGroupMemberShipByGroupInput = {
      groupId: groupId,
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    const result = await listGroupMemberShipByGroup({ userProvider, groupProvider, groupMemberShipProvider })(input);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
  });

  it("should not list group member ship by group if group is not exist", async () => {
    const requestUserId = await createUser();
    const input: ListGroupMemberShipByGroupInput = {
      groupId: "5e14feb0-6b1a-4d4b-b5f1-cc2b36684913",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    const result = await listGroupMemberShipByGroup({ userProvider, groupProvider, groupMemberShipProvider })(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("BAD_REQUEST");
    expect(result._unsafeUnwrapErr().message).toBe("Group is not found");
    expect(result._unsafeUnwrapErr().userMessage).toBe("Group is not found");
    expect(result._unsafeUnwrapErr().systemMessage).toBe("Group is not found");
  });
});
