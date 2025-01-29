import { describe, expect, it, vi } from "vitest";
import { createIsUserInGroup, createIsGroupOwner } from "./membership";
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
