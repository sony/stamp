import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import {
  CreateGroupInput,
  CreateGroupMemberNotificationInput,
  CreateApprovalRequestNotificationInput,
  DeleteGroupInput,
  DeleteGroupMemberNotificationInput,
  DeleteApprovalRequestNotificationInput,
  GetGroupInput,
  ListGroupInput,
  UpdateGroupInput,
  UpdateGroupMemberNotificationInput,
  UpdateApprovalRequestNotificationInput,
} from "@stamp-lib/stamp-types/pluginInterface/identity";
import { afterAll, describe, expect, it } from "vitest";
import {
  createGroupMemberNotificationImpl,
  createApprovalRequestNotificationImpl,
  createImpl,
  deleteGroupMemberNotificationImpl,
  deleteApprovalRequestNotificationImpl,
  deleteImpl,
  getImpl,
  listImpl,
  updateGroupMemberNotificationImpl,
  updateApprovalRequestNotificationImpl,
  updateImpl,
} from "./group";

const logger = createLogger("DEBUG", { moduleName: "plugins" });
const groupName = "test-group-name";
const description = "test-description";
let groupId = "";
let notificationId = "";
const tableName = `${process.env.DYNAMO_TABLE_PREFIX}-dynamodb-identity-Group`;
const config = { region: "us-west-2" };

describe("Testing group", () => {
  afterAll(async () => {
    await deleteImpl(logger)({ groupId: groupId }, tableName, config);
  });

  describe("createImpl", () => {
    it("should successfully create group with valid input", async () => {
      const input: CreateGroupInput = {
        groupName: groupName,
        description: description,
      };
      const expected = {
        groupId: expect.any(String),
        groupName: groupName,
        description: description,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      };
      const resultAsync = createImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
      groupId = result.value.groupId;
    });
  });

  describe("getImpl", () => {
    it("should successfully get group with valid input", async () => {
      const input: GetGroupInput = {
        groupId: groupId,
      };
      const expected = {
        groupId: groupId,
        groupName: groupName,
        description: description,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("returns none if group ID does not exist", async () => {
      const input: GetGroupInput = {
        groupId: "non-existent-group-id",
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failure result if group ID is empty", async () => {
      const input: GetGroupInput = {
        groupId: "",
      };
      const resultAsync = getImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listImpl", () => {
    it("should successfully list groups with valid input", async () => {
      const input: ListGroupInput = {
        groupNamePrefix: undefined,
        limit: undefined,
        paginationToken: undefined,
      };
      const resultAsync = listImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.items.length).not.toBe(0);
    });
  });

  describe("updateImpl", () => {
    it("should successfully update group with valid input", async () => {
      const input: UpdateGroupInput = {
        groupId: groupId,
        groupName: "test-updated-group-name",
        description: "test-updated-description",
      };
      const expected = {
        groupId: groupId,
        groupName: "test-updated-group-name",
        description: "test-updated-description",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      };
      const resultAsync = updateImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it.each([
      [
        "group ID does not exist",
        {
          groupId: "non-existent-group-id",
          groupName: "test-updated-group-name",
          description: "test-updated-description",
        },
      ],
      [
        "group ID is empty",
        {
          groupId: "",
          groupName: "test-updated-group-name",
          description: "test-updated-description",
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = updateImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("createGroupMemberNotificationImpl", () => {
    it("should successfully create groupMemberNotification with valid input", async () => {
      const input: CreateGroupMemberNotificationInput = {
        groupId: groupId,
        notificationChannel: {
          id: "test-channel-id",
          typeId: "slack",
          properties: { channelId: "test-channel-id", customMessage: "test-message" },
        },
      };
      const expected = {
        groupId: groupId,
        groupName: expect.any(String),
        description: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        groupMemberNotifications: [
          {
            id: expect.any(String),
            notificationChannel: {
              id: "test-channel-id",
              typeId: "slack",
              properties: { channelId: "test-channel-id", customMessage: "test-message" },
            },
          },
        ],
      };
      const resultAsync = createGroupMemberNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
      if (result.value.groupMemberNotifications) {
        notificationId = result.value.groupMemberNotifications[0].id;
        console.log("notificationId", notificationId);
      }
    });

    it("returns failure result if group ID does not exist", async () => {
      const input: CreateGroupMemberNotificationInput = {
        groupId: "non-existent-group-id",
        notificationChannel: {
          id: "test-channel-id",
          typeId: "slack",
          properties: { channelId: "test-channel-id", customMessage: "test-message" },
        },
      };
      const resultAsync = createGroupMemberNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("updateGroupMemberNotificationImpl", () => {
    it("should successfully update groupMemberNotification with valid input", async () => {
      const input: UpdateGroupMemberNotificationInput = {
        groupId: groupId,
        notificationId: notificationId,
        notificationChannel: {
          id: "test-update-channel-id",
          typeId: "slack",
          properties: { channelId: "test-update-channel-id", customMessage: "test-update-message" },
        },
      };
      const expected = {
        groupId: groupId,
        groupName: expect.any(String),
        description: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        groupMemberNotifications: [
          {
            id: notificationId,
            notificationChannel: {
              id: "test-update-channel-id",
              typeId: "slack",
              properties: { channelId: "test-update-channel-id", customMessage: "test-update-message" },
            },
          },
        ],
      };
      const resultAsync = updateGroupMemberNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failure result if group ID does not exist", async () => {
      const input: UpdateGroupMemberNotificationInput = {
        groupId: "non-existent-group-id",
        notificationId: notificationId,
        notificationChannel: {
          id: "test-update-channel-id",
          typeId: "slack",
          properties: { channelId: "test-update-channel-id", customMessage: "test-update-message" },
        },
      };
      const resultAsync = updateGroupMemberNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Group does not exist");
    });

    it("returns failure result if notification ID does not exist", async () => {
      const input: UpdateGroupMemberNotificationInput = {
        groupId: groupId,
        notificationId: "non-existent-notification-id",
        notificationChannel: {
          id: "test-update-channel-id",
          typeId: "slack",
          properties: { channelId: "test-update-channel-id", customMessage: "test-update-message" },
        },
      };
      const resultAsync = updateGroupMemberNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Target group member notification does not exist");
    });
  });

  describe("deleteGroupMemberNotificationImpl", () => {
    it("returns failure result if group ID does not exist", async () => {
      const input: DeleteGroupMemberNotificationInput = {
        groupId: "non-existent-group-id",
        notificationId: notificationId,
      };
      const resultAsync = deleteGroupMemberNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Group does not exist");
    });

    it("returns failure result if notification ID does not exist", async () => {
      const input: DeleteGroupMemberNotificationInput = {
        groupId: groupId,
        notificationId: "non-existent-notification-id",
      };
      const resultAsync = deleteGroupMemberNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Target group member notification does not exist");
    });

    it("should successfully delete groupMemberNotification with valid input", async () => {
      const input: DeleteGroupMemberNotificationInput = {
        groupId: groupId,
        notificationId: notificationId,
      };
      const expected = {
        groupId: groupId,
        groupName: expect.any(String),
        description: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        groupMemberNotifications: [],
      };
      const resultAsync = deleteGroupMemberNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });
  });

  describe("createApprovalRequestNotificationImpl", () => {
    it("should successfully create approvalRequestNotification with valid input", async () => {
      const input: CreateApprovalRequestNotificationInput = {
        groupId: groupId,
        notificationChannel: {
          id: "test-channel-id",
          typeId: "slack",
          properties: { channelId: "test-channel-id", customMessage: "test-message" },
        },
      };
      const expected = {
        groupId: groupId,
        groupName: expect.any(String),
        description: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        approvalRequestNotifications: [
          {
            id: expect.any(String),
            notificationChannel: {
              id: "test-channel-id",
              typeId: "slack",
              properties: { channelId: "test-channel-id", customMessage: "test-message" },
            },
          },
        ],
        groupMemberNotifications: [],
      };
      const resultAsync = createApprovalRequestNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
      if (result.value.approvalRequestNotifications) {
        notificationId = result.value.approvalRequestNotifications[0].id;
        console.log("notificationId", notificationId);
      }
    });

    it("returns failure result if group ID does not exist", async () => {
      const input: CreateApprovalRequestNotificationInput = {
        groupId: "non-existent-group-id",
        notificationChannel: {
          id: "test-channel-id",
          typeId: "slack",
          properties: { channelId: "test-channel-id", customMessage: "test-message" },
        },
      };
      const resultAsync = createApprovalRequestNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("updateApprovalRequestNotificationImpl", () => {
    it("should successfully update approval request notification with valid input", async () => {
      const input: UpdateApprovalRequestNotificationInput = {
        groupId: groupId,
        notificationId: notificationId,
        notificationChannel: {
          id: "test-update-channel-id",
          typeId: "slack",
          properties: { channelId: "test-update-channel-id", customMessage: "test-update-message" },
        },
      };
      const expected = {
        groupId: groupId,
        groupName: expect.any(String),
        description: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        approvalRequestNotifications: [
          {
            id: notificationId,
            notificationChannel: {
              id: "test-update-channel-id",
              typeId: "slack",
              properties: { channelId: "test-update-channel-id", customMessage: "test-update-message" },
            },
          },
        ],
        groupMemberNotifications: [],
      };
      const resultAsync = updateApprovalRequestNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failure result if group ID does not exist", async () => {
      const input: UpdateApprovalRequestNotificationInput = {
        groupId: "non-existent-group-id",
        notificationId: notificationId,
        notificationChannel: {
          id: "test-update-channel-id",
          typeId: "slack",
          properties: { channelId: "test-update-channel-id", customMessage: "test-update-message" },
        },
      };
      const resultAsync = updateApprovalRequestNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Group does not exist");
    });

    it("returns failure result if notification ID does not exist", async () => {
      const input: UpdateApprovalRequestNotificationInput = {
        groupId: groupId,
        notificationId: "non-existent-notification-id",
        notificationChannel: {
          id: "test-update-channel-id",
          typeId: "slack",
          properties: { channelId: "test-update-channel-id", customMessage: "test-update-message" },
        },
      };
      const resultAsync = updateApprovalRequestNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Target approval request notification does not exist");
    });
  });

  describe("deleteApprovalRequestNotificationImpl", () => {
    it("returns failure result if group ID does not exist", async () => {
      const input: DeleteApprovalRequestNotificationInput = {
        groupId: "non-existent-group-id",
        notificationId: notificationId,
      };
      const resultAsync = deleteApprovalRequestNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Group does not exist");
    });

    it("returns failure result if notification ID does not exist", async () => {
      const input: DeleteApprovalRequestNotificationInput = {
        groupId: groupId,
        notificationId: "non-existent-notification-id",
      };
      const resultAsync = deleteApprovalRequestNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Target approval request notification does not exist");
    });

    it("should successfully delete approvalRequestNotification with valid input", async () => {
      const input: DeleteApprovalRequestNotificationInput = {
        groupId: groupId,
        notificationId: notificationId,
      };
      const expected = {
        groupId: groupId,
        groupName: expect.any(String),
        description: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        groupMemberNotifications: [],
        approvalRequestNotifications: [],
      };
      const resultAsync = deleteApprovalRequestNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });
  });

  describe("deleteImpl", () => {
    it("should successfully delete group with valid input", async () => {
      const input: DeleteGroupInput = {
        groupId: groupId,
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if group ID does not exist", async () => {
      const input: DeleteGroupInput = {
        groupId: "non-existent-group-id",
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if group ID is empty", async () => {
      const input: DeleteGroupInput = {
        groupId: "",
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
