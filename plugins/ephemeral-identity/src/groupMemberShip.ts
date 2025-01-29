import { Option, none, some } from "@stamp-lib/stamp-option";
import { GroupMemberShip, GroupMemberShipProvider, IdentityPluginError } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, okAsync } from "neverthrow";

const groupMemberShipsMap = new Map<string, Array<GroupMemberShip>>();

/**
 * This is an example implementation of GroupMemberShipProvider.
 * nextPaginationToken is not considered
 */
export const groupMemberShipProvider: GroupMemberShipProvider = {
  get: function (input): ResultAsync<Option<GroupMemberShip>, IdentityPluginError> {
    const groupMemberShips = groupMemberShipsMap.get(input.groupId);
    if (!groupMemberShips) {
      return okAsync(none);
    }
    for (const groupMemberShip of groupMemberShips) {
      if (groupMemberShip.userId === input.userId) {
        return okAsync(some(structuredClone(groupMemberShip)));
      }
    }
    return okAsync(none);
  },
  listByGroup: function (input): ResultAsync<{ items: Array<GroupMemberShip>; nextPaginationToken?: string }, IdentityPluginError> {
    const groupMemberShips = groupMemberShipsMap.get(input.groupId);
    if (!groupMemberShips) {
      return okAsync({ items: [] });
    } else {
      const results = [];
      for (const groupMemberShip of groupMemberShips) {
        results.push(groupMemberShip);
        if (input.limit && results.length >= input.limit) {
          break;
        }
      }
      return okAsync({ items: structuredClone(results) });
    }
  },
  listByUser: function (input): ResultAsync<{ items: Array<GroupMemberShip>; nextPaginationToken?: string }, IdentityPluginError> {
    const userGroupMemberShips = [];
    for (const groupMemberShips of groupMemberShipsMap.values()) {
      for (const groupMemberShip of groupMemberShips) {
        if (groupMemberShip.userId === input.userId) {
          userGroupMemberShips.push(groupMemberShip);
        }
      }
    }
    return okAsync({ items: structuredClone(userGroupMemberShips) });
  },
  create: function (input): ResultAsync<GroupMemberShip, IdentityPluginError> {
    let groupMemberShips = groupMemberShipsMap.get(input.groupId);
    if (!groupMemberShips) {
      groupMemberShipsMap.set(input.groupId, []);
      groupMemberShips = [];
    }
    const groupMemberShip: GroupMemberShip = {
      groupId: input.groupId,
      userId: input.userId,
      role: input.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    groupMemberShipsMap.set(groupMemberShip.groupId, [...groupMemberShips, groupMemberShip]);
    return okAsync(structuredClone(groupMemberShip));
  },
  delete: function (input): ResultAsync<void, IdentityPluginError> {
    groupMemberShipsMap.delete(input.groupId);
    return okAsync(undefined);
  },
  update: function (input): ResultAsync<GroupMemberShip, IdentityPluginError> {
    const groupMemberShips = groupMemberShipsMap.get(input.groupId);
    if (!groupMemberShips) {
      throw new Error("GroupMemberShip not found");
    }
    for (const groupMemberShip of groupMemberShips) {
      if (groupMemberShip.userId === input.userId) {
        groupMemberShip.role = input.role;
        groupMemberShip.updatedAt = new Date().toISOString();
        return okAsync(structuredClone(groupMemberShip));
      }
    }
    throw new Error("GroupMemberShip not found");
  },
  count: function (input): ResultAsync<number, IdentityPluginError> {
    const groupMemberShips = groupMemberShipsMap.get(input.groupId);
    if (!groupMemberShips) {
      return okAsync(0);
    }
    const count = groupMemberShips.length;
    return okAsync(count);
  },
};
