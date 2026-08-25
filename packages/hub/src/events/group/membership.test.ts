import { describe, expect, it, vi } from "vitest";
import { createIsUserInGroup, createIsGroupOwner, createIsUserInGroupFromSet, createListAllGroupIdsByUser } from "./membership";
import { some, none } from "@stamp-lib/stamp-option";
import { IdentityPluginError } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { okAsync, errAsync } from "neverthrow";

const groupId = "f9d31ccf-4fe2-de41-b192-cd264f6a191e"; // uuid is meaningless and was generated for testing.
const userId = "f9d31ccf-4fe2-de41-b192-cd264f6a191e"; // uuid is meaningless and was generated for testing.

describe("Testing membership", () => {
  describe("createIsUserInGroup", () => {
    it("checks user in group", async () => {
      const getGroupMemberShipSuccess = vi.fn().mockReturnValue(
        okAsync(
          some({
            userId: userId,
            createdAt: "2024-01-11T03:04:05.006Z",
            groupId: groupId,
            updatedAt: "2024-02-22T03:04:05.006Z",
            role: "member",
          })
        )
      );
      const isUserInGroup = createIsUserInGroup(getGroupMemberShipSuccess);
      const input = {
        userId: userId,
        groupId: groupId,
      };
      const result = await isUserInGroup(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(true);
    });

    it("checks user is not in group if return value of getGroupMemberShip does not Some", async () => {
      const getGroupMemberShipDoesNotSome = vi.fn().mockReturnValue(okAsync(none));
      const isUserInGroup = createIsUserInGroup(getGroupMemberShipDoesNotSome);
      const input = {
        userId: userId,
        groupId: groupId,
      };
      const result = await isUserInGroup(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(false);
    });

    it("returns error if getGroupMemberShip returns error", async () => {
      const getGroupMemberShipError = vi.fn().mockReturnValue(errAsync(new IdentityPluginError("This is Identity Plugin Error", "INTERNAL_SERVER_ERROR")));
      const isUserInGroup = createIsUserInGroup(getGroupMemberShipError);
      const input = {
        userId: userId,
        groupId: groupId,
      };
      const result = await isUserInGroup(input);
      expect(result.isErr()).toBe(true);
    });
  });

  describe("createIsGroupOwner", () => {
    const getGroupMemberShipSuccess = vi.fn().mockReturnValue(
      okAsync(
        some({
          userId: userId,
          createdAt: "2024-01-11T03:04:05.006Z",
          groupId: groupId,
          updatedAt: "2024-02-22T03:04:05.006Z",
          role: "owner",
        })
      )
    );
    it("checks user is group owner", async () => {
      const isGroupOwnerImpl = createIsGroupOwner(getGroupMemberShipSuccess);
      const input = {
        userId: userId,
        groupId: groupId,
      };
      const result = await isGroupOwnerImpl(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(true);
    });

    it("checks user is not group owner if return value of getGroupMemberShip does not Some", async () => {
      const getGroupMemberShipDoesNotSome = vi.fn().mockReturnValue(okAsync(none));
      const isGroupOwnerImpl = createIsGroupOwner(getGroupMemberShipDoesNotSome);
      const input = {
        userId: userId,
        groupId: groupId,
      };
      const result = await isGroupOwnerImpl(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(false);
    });

    it("checks user is not group owner if role property does not owner", async () => {
      const getGroupMemberShipDoesNotOwner = vi.fn().mockReturnValue(
        okAsync(
          some({
            userId: userId,
            createdAt: "2024-01-11T03:04:05.006Z",
            groupId: groupId,
            updatedAt: "2024-02-22T03:04:05.006Z",
            role: "member",
          })
        )
      );
      const isGroupOwnerImpl = createIsGroupOwner(getGroupMemberShipDoesNotOwner);
      const input = {
        userId: userId,
        groupId: groupId,
      };
      const result = await isGroupOwnerImpl(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(false);
    });

    it("returns error if getGroupMemberShip returns error", async () => {
      const getGroupMemberShipError = vi.fn().mockReturnValue(errAsync(new IdentityPluginError("This is Identity Plugin Error", "INTERNAL_SERVER_ERROR")));
      const isGroupOwnerImpl = createIsGroupOwner(getGroupMemberShipError);
      const input = {
        userId: userId,
        groupId: groupId,
      };
      const result = await isGroupOwnerImpl(input);
      expect(result.isErr()).toBe(true);
    });
  });
});

describe("createIsUserInGroupFromSet", () => {
  const userId = "47f29c51-204c-09f6-2069-f3df073568c7";
  const groupId = "1f10d463-a2fe-c407-2b95-05b561346c8b";
  const otherGroupId = "7c2b9e4d-1a3f-4c5e-9b8a-6d5c4b3a2f1e";

  it("returns true for a group in the set and false otherwise", async () => {
    const isUserInGroup = createIsUserInGroupFromSet(new Set([groupId]));
    expect((await isUserInGroup({ userId, groupId }))._unsafeUnwrap()).toBe(true);
    expect((await isUserInGroup({ userId, groupId: otherGroupId }))._unsafeUnwrap()).toBe(false);
  });

  it("validates input", async () => {
    const isUserInGroup = createIsUserInGroupFromSet(new Set([groupId]));
    const result = await isUserInGroup({ userId: "invalid", groupId });
    expect(result.isErr()).toBe(true);
  });
});

describe("createListAllGroupIdsByUser", () => {
  const userId = "47f29c51-204c-09f6-2069-f3df073568c7";
  const g1 = "1f10d463-a2fe-c407-2b95-05b561346c8b";
  const g2 = "7c2b9e4d-1a3f-4c5e-9b8a-6d5c4b3a2f1e";
  const membership = (groupId: string) => ({ groupId, userId, role: "member" as const, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" });

  it("collects a single page", async () => {
    const listByUser = vi.fn().mockReturnValue(okAsync({ items: [membership(g1), membership(g2)] }));
    const result = await createListAllGroupIdsByUser(listByUser)(userId);
    expect(result._unsafeUnwrap()).toEqual(new Set([g1, g2]));
    expect(listByUser).toHaveBeenCalledWith({ userId, limit: 100, paginationToken: undefined });
  });

  it("follows nextPaginationToken", async () => {
    const listByUser = vi
      .fn()
      .mockReturnValueOnce(okAsync({ items: [membership(g1)], nextPaginationToken: "next" }))
      .mockReturnValueOnce(okAsync({ items: [membership(g2)] }));
    const result = await createListAllGroupIdsByUser(listByUser)(userId);
    expect(result._unsafeUnwrap()).toEqual(new Set([g1, g2]));
    expect(listByUser).toHaveBeenCalledTimes(2);
    expect(listByUser.mock.calls[1][0].paginationToken).toBe("next");
  });

  it("propagates identity errors", async () => {
    const listByUser = vi.fn().mockReturnValue(errAsync(new IdentityPluginError("This is Identity Plugin Error", "INTERNAL_SERVER_ERROR")));
    const result = await createListAllGroupIdsByUser(listByUser)(userId);
    expect(result.isErr()).toBe(true);
  });

  it("stops with an error if the token never clears", async () => {
    const listByUser = vi.fn().mockReturnValue(okAsync({ items: [], nextPaginationToken: "again" }));
    const result = await createListAllGroupIdsByUser(listByUser)(userId);
    expect(result._unsafeUnwrapErr().code).toBe("INTERNAL_SERVER_ERROR");
  });
});
