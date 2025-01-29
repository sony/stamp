import { Option, none, some } from "@stamp-lib/stamp-option";
import { Group, GroupProvider, IdentityPluginError } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync, errAsync, okAsync } from "neverthrow";

const GroupMap = new Map<string, Group>();
export const groupProvider: GroupProvider = {
  get: function (input): ResultAsync<Option<Group>, IdentityPluginError> {
    const group = GroupMap.get(input.groupId);
    if (!group) {
      return okAsync(none);
    } else {
      return okAsync(some(group));
    }
  },
  list: function (input): ResultAsync<{ items: Array<Group>; nextPaginationToken?: string }, IdentityPluginError> {
    const groups = [];
    for (const group of GroupMap.values()) {
      if (input.groupNamePrefix && !group.groupName.startsWith(input.groupNamePrefix)) {
        continue;
      }
      groups.push(group);
      if (input.limit && groups.length >= input.limit) {
        break;
      }
    }
    return okAsync({ items: groups });
  },
  create: function (input): ResultAsync<Group, IdentityPluginError> {
    const group: Group = {
      groupId: globalThis.crypto.randomUUID(),
      groupName: input.groupName,
      description: input.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    GroupMap.set(group.groupId, group);
    return okAsync(group);
  },
  delete: function (input): ResultAsync<void, IdentityPluginError> {
    GroupMap.delete(input.groupId);
    return okAsync(undefined);
  },
  update: function (input): ResultAsync<Group, IdentityPluginError> {
    const group = GroupMap.get(input.groupId);
    if (!group) {
      return errAsync(new Error("Group not found"));
    }
    const newGroup: Group = {
      groupId: group.groupId,
      groupName: input.groupName,
      description: input.description,
      createdAt: group.createdAt,
      updatedAt: new Date().toISOString(),
    };
    GroupMap.set(newGroup.groupId, newGroup);
    return okAsync(newGroup);
  },
  createGroupMemberNotification: function (input): ResultAsync<Group, IdentityPluginError> {
    const group = GroupMap.get(input.groupId);
    if (!group) {
      return errAsync(new Error("Group not found"));
    }
    const newGroup: Group = {
      groupId: group.groupId,
      groupName: group.groupName,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: new Date().toISOString(),
      groupMemberNotifications: [{ id: "", notificationChannel: input.notificationChannel }],
    };
    GroupMap.set(newGroup.groupId, newGroup);
    return okAsync(newGroup);
  },
  updateGroupMemberNotification: function (input): ResultAsync<Group, IdentityPluginError> {
    const group = GroupMap.get(input.groupId);
    if (!group) {
      return errAsync(new Error("Group not found"));
    }
    const newGroup: Group = {
      groupId: group.groupId,
      groupName: group.groupName,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: new Date().toISOString(),
      groupMemberNotifications: [{ id: input.notificationId, notificationChannel: input.notificationChannel }],
    };
    GroupMap.set(newGroup.groupId, newGroup);
    return okAsync(newGroup);
  },
  deleteGroupMemberNotification: function (input): ResultAsync<Group, IdentityPluginError> {
    const group = GroupMap.get(input.groupId);
    if (!group) {
      return errAsync(new Error("Group not found"));
    }
    const newGroup: Group = {
      groupId: group.groupId,
      groupName: group.groupName,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: new Date().toISOString(),
    };
    GroupMap.set(newGroup.groupId, newGroup);
    return okAsync(newGroup);
  },
  createApprovalRequestNotification: function (input) {
    const group = GroupMap.get(input.groupId);
    if (!group) {
      return errAsync(new IdentityPluginError("Group not found", "BAD_REQUEST"));
    }

    const newNotification = {
      id: globalThis.crypto.randomUUID(),
      notificationChannel: input.notificationChannel,
    };

    const updatedGroup: Group = {
      ...group,
      approvalRequestNotifications: group.approvalRequestNotifications ? [...group.approvalRequestNotifications, newNotification] : [newNotification],
      updatedAt: new Date().toISOString(),
    };

    GroupMap.set(input.groupId, updatedGroup);
    return okAsync(updatedGroup);
  },
  updateApprovalRequestNotification: function (input) {
    const group = GroupMap.get(input.groupId);
    if (!group) {
      return errAsync(new IdentityPluginError("Group not found", "BAD_REQUEST"));
    }

    if (!group.approvalRequestNotifications) {
      return errAsync(new IdentityPluginError("Approval request notifications do not exist", "BAD_REQUEST"));
    }

    const notificationIndex = group.approvalRequestNotifications.findIndex((notification) => notification.id === input.notificationId);

    if (notificationIndex === -1) {
      return errAsync(new IdentityPluginError("Target approval request notification does not exist", "BAD_REQUEST"));
    }

    const updatedNotification = {
      ...group.approvalRequestNotifications[notificationIndex],
      notificationChannel: input.notificationChannel,
    };

    const updatedNotifications = [...group.approvalRequestNotifications];
    updatedNotifications[notificationIndex] = updatedNotification;

    const updatedGroup: Group = {
      ...group,
      approvalRequestNotifications: updatedNotifications,
      updatedAt: new Date().toISOString(),
    };

    GroupMap.set(input.groupId, updatedGroup);
    return okAsync(updatedGroup);
  },
  deleteApprovalRequestNotification: function (input) {
    const group = GroupMap.get(input.groupId);
    if (!group) {
      return errAsync(new IdentityPluginError("Group not found", "BAD_REQUEST"));
    }

    if (!group.approvalRequestNotifications) {
      return errAsync(new IdentityPluginError("Approval request notifications do not exist", "BAD_REQUEST"));
    }

    const notificationIndex = group.approvalRequestNotifications.findIndex((notification) => notification.id === input.notificationId);

    if (notificationIndex === -1) {
      return errAsync(new IdentityPluginError("Target approval request notification does not exist", "BAD_REQUEST"));
    }

    const updatedNotifications = group.approvalRequestNotifications.filter((notification) => notification.id !== input.notificationId);

    const updatedGroup: Group = {
      ...group,
      approvalRequestNotifications: updatedNotifications,
      updatedAt: new Date().toISOString(),
    };

    GroupMap.set(input.groupId, updatedGroup);
    return okAsync(updatedGroup);
  },
};
