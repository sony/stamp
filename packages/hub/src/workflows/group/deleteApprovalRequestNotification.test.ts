import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { GroupMemberShipProvider, GroupProvider, UserProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { deleteApprovalRequestNotification } from "./deleteApprovalRequestNotification";
import { DeleteApprovalRequestNotificationInput } from "./input";

describe("deleteApprovalRequestNotification", () => {
  const logger = createLogger("DEBUG", { moduleName: "hub" });
  const mockGetUserProvider = vi.fn();
  const userProvider: UserProvider = {
    get: mockGetUserProvider,
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const mockGetGroupProvider = vi.fn();
  const mockDeleteApprovalRequestNotificationGroupProvider = vi.fn((value) => {
    return okAsync(value);
  });
  const groupProvider: GroupProvider = {
    get: mockGetGroupProvider,
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    createGroupMemberNotification: vi.fn(),
    updateGroupMemberNotification: vi.fn(),
    deleteGroupMemberNotification: vi.fn(),
    createApprovalRequestNotification: vi.fn(),
    updateApprovalRequestNotification: vi.fn(),
    deleteApprovalRequestNotification: mockDeleteApprovalRequestNotificationGroupProvider,
  };
  const mockGetGroupMemberShipProvider = vi.fn();
  const groupMemberShipProvider: GroupMemberShipProvider = {
    get: mockGetGroupMemberShipProvider,
    listByGroup: vi.fn(),
    listByUser: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };
  const mockAdminProvider = vi.fn();

  const mockGetNotificationPluginConfig = vi.fn();

  const input: DeleteApprovalRequestNotificationInput = {
    requestUserId: "8776d133-4019-4d62-afcf-9395bba40734",
    groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
    notificationId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  };

  const group = { groupId: "group1", groupName: "test-group" };
  const groupWithMemberNotification = {
    ...group,
    approvalRequestNotifications: [
      {
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        notificationChannel: {
          id: "test-channel-id",
          typeId: "slack",
          properties: { channelId: "test-channel-id", customMessage: "test-message" },
        },
      },
    ],
  };
  const groupWithInvalidMemberNotification = {
    ...group,
    approvalRequestNotifications: [
      {
        id: "invalid-notification-id",
        notificationChannel: {
          id: "test-channel-id",
          typeId: "slack",
          properties: { channelId: "test-channel-id", customMessage: "test-message" },
        },
      },
    ],
  };

  it("should return an error if input parsing fails", async () => {
    const invalidInput = {} as DeleteApprovalRequestNotificationInput; // Invalid input
    const result = await deleteApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(invalidInput);
    expect(result.isOk()).toBe(false);
  });

  it("should return an error if the group does not have approvalRequestNotifications", async () => {
    const invalidInput: DeleteApprovalRequestNotificationInput = {
      requestUserId: "8776d133-4019-4d62-afcf-9395bba40734",
      groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
      notificationId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    };
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetGroupProvider.mockReturnValue(okAsync(some(group)));
    mockGetGroupMemberShipProvider.mockReturnValue(okAsync(some({ role: "owner" })));
    mockAdminProvider.mockReturnValue(okAsync(true));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: vi.fn().mockReturnValue(okAsync({})) } })));
    const result = await deleteApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(invalidInput);
    expect(result.isOk()).toBe(false);
    expect(result._unsafeUnwrapErr().message).toBe("Target approvalRequestNotifications does not exist");
  });

  it("should delete groupMemberNotification", async () => {
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetGroupProvider.mockReturnValue(okAsync(some(groupWithMemberNotification)));
    mockGetGroupMemberShipProvider.mockReturnValue(okAsync(some({ role: "owner" })));
    mockAdminProvider.mockReturnValue(okAsync(true));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: vi.fn().mockReturnValue(okAsync({})) } })));

    const result = await deleteApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(input);
    console.log("result", result);
    expect(result.isOk()).toBe(true);
  });

  it("should return an error if the requesting user does not have permission", async () => {
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetGroupProvider.mockReturnValue(okAsync(some(groupWithMemberNotification)));
    mockGetGroupMemberShipProvider.mockReturnValue(okAsync(some({ role: "member" })));
    mockAdminProvider.mockReturnValue(okAsync(false));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: vi.fn().mockReturnValue(okAsync({})) } })));

    const result = await deleteApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Permission denied");
  });

  it("should return an error if the requesting user is not found", async () => {
    mockGetUserProvider.mockReturnValue(okAsync(none));
    mockGetGroupProvider.mockReturnValue(okAsync(some(groupWithMemberNotification)));
    mockGetGroupMemberShipProvider.mockReturnValue(okAsync(some({ role: "owner" })));
    mockAdminProvider.mockReturnValue(okAsync(true));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: vi.fn().mockReturnValue(okAsync({})) } })));

    const result = await deleteApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Request user is not found");
  });

  it("should return an error if the group is not found", async () => {
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetGroupProvider.mockReturnValue(okAsync(none));
    mockGetGroupMemberShipProvider.mockReturnValue(okAsync(some({ role: "owner" })));
    mockAdminProvider.mockReturnValue(okAsync(true));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: vi.fn().mockReturnValue(okAsync({})) } })));

    const result = await deleteApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Group is not found");
  });

  it("should return an error if the notification type ID is not found in approvalRequestNotifications", async () => {
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetGroupProvider.mockReturnValue(okAsync(some(groupWithInvalidMemberNotification)));
    mockGetGroupMemberShipProvider.mockReturnValue(okAsync(some({ role: "owner" })));
    mockAdminProvider.mockReturnValue(okAsync(true));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: vi.fn().mockReturnValue(okAsync({})) } })));

    const result = await deleteApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(input);
    expect(result.isErr()).toBe(true);
    console.log("result", result);
    expect(result._unsafeUnwrapErr().message).toBe("Target notification ID not found in approvalRequestNotifications");
  });

  it("should return an error if the notification type ID is not found in the notification plugin", async () => {
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetGroupProvider.mockReturnValue(okAsync(some(groupWithMemberNotification)));
    mockGetGroupMemberShipProvider.mockReturnValue(okAsync(some({ role: "owner" })));
    mockAdminProvider.mockReturnValue(okAsync(true));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(none)); // notification type ID not found in notification plugin

    const result = await deleteApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Target notification type ID not found in notification plugin");
  });
});
