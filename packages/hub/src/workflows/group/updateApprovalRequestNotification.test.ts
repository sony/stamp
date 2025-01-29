import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { GroupMemberShipProvider, GroupProvider, UserProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { UpdateApprovalRequestNotificationInput } from "./input";
import { updateApprovalRequestNotification } from "./updateApprovalRequestNotification";

describe("updateApprovalRequestNotification", () => {
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
  const mockUpdateApprovalRequestNotificationGroupProvider = vi.fn((value) => {
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
    updateApprovalRequestNotification: mockUpdateApprovalRequestNotificationGroupProvider,
    deleteApprovalRequestNotification: vi.fn(),
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

  const input: UpdateApprovalRequestNotificationInput = {
    requestUserId: "8776d133-4019-4d62-afcf-9395bba40734",
    groupId: "8204a484-c5da-4648-810a-c095e2d473a3",
    notificationId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    notificationChannel: {
      id: "test-channel-id",
      typeId: "slack",
      properties: { channelId: "test-channel-id", customMessage: "test-message" },
    },
  };

  it("should return an error if input parsing fails", async () => {
    const invalidInput = {} as UpdateApprovalRequestNotificationInput; // Invalid input
    const result = await updateApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(invalidInput);
    expect(result.isOk()).toBe(false);
  });

  it("should update group member notification", async () => {
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetGroupProvider.mockReturnValue(okAsync(some({ groupId: "group1", groupName: "test-group" })));
    mockGetGroupMemberShipProvider.mockReturnValue(okAsync(some({ role: "owner" })));
    mockAdminProvider.mockReturnValue(okAsync(true));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { setChannel: vi.fn().mockReturnValue(okAsync({})) } })));

    const result = await updateApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(input);
    expect(result.isOk()).toBe(true);
  });

  it("should return an error if does not have permission", async () => {
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetGroupProvider.mockReturnValue(okAsync(some({ groupId: "group1", groupName: "test-group" })));
    mockGetGroupMemberShipProvider.mockReturnValue(okAsync(some({ role: "member" })));
    mockAdminProvider.mockReturnValue(okAsync(false));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { setChannel: vi.fn().mockReturnValue(okAsync({})) } })));

    const result = await updateApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Permission denied");
  });

  it("should return an error if request user is not found", async () => {
    mockGetUserProvider.mockReturnValue(okAsync(none));
    mockGetGroupProvider.mockReturnValue(okAsync(some({ groupId: "group1", groupName: "test-group" })));
    mockGetGroupMemberShipProvider.mockReturnValue(okAsync(some({ role: "owner" })));
    mockAdminProvider.mockReturnValue(okAsync(true));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { setChannel: vi.fn().mockReturnValue(okAsync({})) } })));

    const result = await updateApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Request user is not found");
  });

  it("should return an error if group is not found", async () => {
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetGroupProvider.mockReturnValue(okAsync(none));
    mockGetGroupMemberShipProvider.mockReturnValue(okAsync(some({ role: "owner" })));
    mockAdminProvider.mockReturnValue(okAsync(true));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { setChannel: vi.fn().mockReturnValue(okAsync({})) } })));

    const result = await updateApprovalRequestNotification(
      logger,
      userProvider,
      groupProvider,
      groupMemberShipProvider,
      mockGetNotificationPluginConfig
    )(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Group is not found");
  });

  it("should return an error if notification type ID is not found in notification plugin", async () => {
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetGroupProvider.mockReturnValue(okAsync(some({ groupId: "group1", groupName: "test-group" })));
    mockGetGroupMemberShipProvider.mockReturnValue(okAsync(some({ role: "owner" })));
    mockAdminProvider.mockReturnValue(okAsync(true));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(none)); // notification type ID not found in notification plugin

    const result = await updateApprovalRequestNotification(
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
