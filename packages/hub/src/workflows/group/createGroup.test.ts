import { expect, it, describe, vi, beforeEach } from "vitest";
import { createGroup } from "./createGroup";
import { CreateGroupInput } from "./input";
import { ephemeralIdentityPlugin } from "@stamp-lib/stamp-ephemeral-identity-plugin";

async function setupUser() {
  const createRequestUserResult = await ephemeralIdentityPlugin.user.create({ userName: "requestUser", email: "user1@example.com" });
  if (createRequestUserResult.isErr()) {
    throw createRequestUserResult.error;
  }

  const requestUserId = createRequestUserResult.value.userId;

  return { requestUserId };
}

describe("createGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });
  it("should create group", async () => {
    // Create user and group
    const { requestUserId } = await setupUser();
    console.log("requestUserId", requestUserId);
    // Set direct permission for request user
    const input: CreateGroupInput = {
      groupName: "group1",
      description: "test",
      requestUserId: requestUserId,
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    const result = await createGroup(input, userProvider, groupProvider, groupMemberShipProvider);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.groupName).toBe("group1");
    expect(result.value.description).toBe("test");
  });

  it("should not create group if requestUser is not exist", async () => {
    const input: CreateGroupInput = {
      groupName: "group1",
      description: "test",
      requestUserId: "7ad3193b-028b-45bd-8727-7fd22c940af4", // random uuid
    };
    const userProvider = ephemeralIdentityPlugin.user;
    const groupProvider = ephemeralIdentityPlugin.group;
    const groupMemberShipProvider = ephemeralIdentityPlugin.groupMemberShip;
    const result = await createGroup(input, userProvider, groupProvider, groupMemberShipProvider);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });
});
