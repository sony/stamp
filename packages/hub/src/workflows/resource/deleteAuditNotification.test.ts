import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { errAsync, okAsync } from "neverthrow";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteAuditNotification } from "./deleteAuditNotification";
import { DeleteAuditNotificationInput } from "./input";

describe("deleteAuditNotification", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const logger = createLogger("DEBUG", { moduleName: "hub" });

  const baseCatalogConfig: CatalogConfig = {
    id: "test-resource-type-id",
    name: "test-catalog-name",
    description: "test-description-approval-flows",
    approvalFlows: [],
    resourceTypes: [],
  };

  const baseResourceTypeConfig: ResourceTypeConfig = {
    id: "resourceType1",
    name: "resourceType1",
    description: "resourceType1",
    createParams: [],
    infoParams: [],
    handlers: {
      createResource: vi.fn(),
      deleteResource: vi.fn(),
      getResource: vi.fn().mockReturnValue(
        okAsync(
          some({
            resourceId: "resource1",
            name: "resource1",
            params: {},
          })
        )
      ),
      updateResource: vi.fn(),
      listResources: vi.fn(),
      listResourceAuditItem: vi.fn(),
    },
    isCreatable: false,
    isUpdatable: false,
    isDeletable: false,
    ownerManagement: true,
    approverManagement: false,
  };

  const mockGetCatalogDBProvider = vi.fn().mockReturnValue(okAsync(some({ id: "catalog1" })));
  const mockGetCatalogConfigProvider = vi.fn().mockReturnValue(
    okAsync(
      some({
        ...baseCatalogConfig,
        resourceTypes: [baseResourceTypeConfig],
      })
    )
  );
  const mockGetResourceDBProvider = vi.fn();
  const mockDeleteAuditNotificationResourceDBProvider = vi.fn();
  const mockGetUserProvider = vi.fn();
  const mockGetGroupMemberShip = vi.fn().mockReturnValue(okAsync(some({})));
  const mockGetNotificationPluginConfig = vi.fn();
  const mockDeleteSchedulerEvent = vi.fn();
  const mockGetSchedulerEvent = vi.fn();
  const mockUnsetChannel = vi.fn().mockReturnValue(okAsync(none));

  const deleteAuditNotificationFn = deleteAuditNotification({
    logger: logger,
    getCatalogDBProvider: mockGetCatalogDBProvider,
    getCatalogConfigProvider: mockGetCatalogConfigProvider,
    getResourceDBProvider: mockGetResourceDBProvider,
    deleteAuditNotificationResourceDBProvider: mockDeleteAuditNotificationResourceDBProvider,
    getGroupMemberShip: mockGetGroupMemberShip,
    getUserProvider: mockGetUserProvider,
    getNotificationPluginConfig: mockGetNotificationPluginConfig,
    deleteSchedulerEvent: mockDeleteSchedulerEvent,
    getSchedulerEvent: mockGetSchedulerEvent,
  });

  const input: DeleteAuditNotificationInput = {
    catalogId: "catalog1",
    resourceTypeId: "resourceType1",
    resourceId: "resource1",
    requestUserId: "f47ac10b-58cc-4372-a567-0e02b2c3d479", // random UUID
    auditNotificationId: "notification1",
  };

  const baseGetResourceDBProvider = {
    id: "resource1",
    catalogId: "catalog1",
    ownerGroupId: "eea40d50-fdff-194b-5690-9ff1b5df55c8", // random UUID
    auditNotifications: [
      {
        id: "notification1",
        notificationChannel: {
          id: "testChannel1",
          typeId: "test",
          properties: {},
        },
        schedulerEventId: "test",
        cronExpression: "* * * * *",
      },
    ],
  };

  it("should return an error if input parsing fails", async () => {
    const invalidInput = {} as DeleteAuditNotificationInput; // Invalid input
    const result = await deleteAuditNotificationFn(invalidInput);
    expect(result.isErr()).toBe(true);
  });

  it("should delete audit notification successfully when target audit notification exist(have notification plugin)", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(some({ id: "formerSchedulerEvent" })));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: mockUnsetChannel } })));
    mockDeleteSchedulerEvent.mockReturnValue(okAsync(some(void 0)));
    mockDeleteAuditNotificationResourceDBProvider.mockReturnValue(okAsync(some({ id: "resource1" })));

    const result = await deleteAuditNotificationFn(input);
    expect(result.isOk()).toBe(true);
  });

  it("should delete audit notification successfully when target audit notification exist(not have notification plugin)", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(some({ id: "formerSchedulerEvent" })));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(none)); // not have notification plugin
    mockDeleteSchedulerEvent.mockReturnValue(undefined); // no setting is required as it will not be called
    mockDeleteAuditNotificationResourceDBProvider.mockReturnValue(okAsync(some({ id: "resource1" })));

    const result = await deleteAuditNotificationFn(input);
    expect(result.isOk()).toBe(true);
  });

  it("should return an error if target audit notification not exist", async () => {
    mockGetResourceDBProvider.mockReturnValue(
      okAsync(
        some({
          ...baseGetResourceDBProvider,
          auditNotifications: [
            {
              id: "notification2", // different from auditNotificationId specified in input
              notificationChannel: {
                id: "testChannel2",
                typeId: "test",
                properties: {},
              },
              schedulerEventId: "test",
              cronExpression: "* * * * *",
            },
          ],
        })
      )
    );
    // no setting is required as it will not be called
    mockGetUserProvider.mockReturnValue(undefined);
    mockGetSchedulerEvent.mockReturnValue(undefined);
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some(none)));
    mockDeleteSchedulerEvent.mockReturnValue(undefined);
    mockDeleteAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await deleteAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Audit Notification is not found");
  });

  it("should return an error if audit notification not set", async () => {
    mockGetResourceDBProvider.mockReturnValue(
      okAsync(
        some({
          ...baseGetResourceDBProvider,
          auditNotifications: [], // auditNotifications is empty
        })
      )
    );
    // no setting is required as it will not be called
    mockGetUserProvider.mockReturnValue(undefined);
    mockGetSchedulerEvent.mockReturnValue(undefined);
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some(none)));
    mockDeleteSchedulerEvent.mockReturnValue(undefined);
    mockDeleteAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await deleteAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Audit Notification is not set");
  });

  it("should delete audit notification successfully when getSchedulerEvent is failed", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(errAsync(new SchedulerError("Failed to get scheduler event"))); // getSchedulerEvent is failed
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: mockUnsetChannel } })));
    mockDeleteSchedulerEvent.mockReturnValue(undefined); // no setting is required as it will not be called
    mockDeleteAuditNotificationResourceDBProvider.mockReturnValue(okAsync(some({ id: "resource1" })));

    const result = await deleteAuditNotificationFn(input);
    expect(result.isOk()).toBe(true);
    expect(mockDeleteSchedulerEvent).toBeCalledTimes(0); // not called
    expect(mockUnsetChannel).toBeCalledTimes(0); // not called
  });

  it("should delete audit notification successfully when return value of getSchedulerEvent is none", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(none)); // return value of getSchedulerEvent is none
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: mockUnsetChannel } })));
    mockDeleteSchedulerEvent.mockReturnValue(undefined); // no setting is required as it will not be called
    mockDeleteAuditNotificationResourceDBProvider.mockReturnValue(okAsync(some({ id: "resource1" })));

    const result = await deleteAuditNotificationFn(input);
    expect(result.isOk()).toBe(true);
    expect(mockDeleteSchedulerEvent).toBeCalledTimes(0); // not called
    expect(mockUnsetChannel).toBeCalledTimes(0); // not called
  });

  it("should delete audit notification successfully when deleteSchedulerEvent is failed", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(some({ id: "formerSchedulerEvent" })));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: mockUnsetChannel } })));
    mockDeleteSchedulerEvent.mockReturnValue(errAsync(new SchedulerError("Failed to delete scheduler event"))); // deleteSchedulerEvent is failed
    mockDeleteAuditNotificationResourceDBProvider.mockReturnValue(okAsync(some({ id: "resource1" })));

    const result = await deleteAuditNotificationFn(input);
    expect(result.isOk()).toBe(true);
    expect(mockUnsetChannel).toBeCalledTimes(0); // not called
  });

  it("should delete audit notification successfully when unsetChannel is failed", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(some({ id: "formerSchedulerEvent" })));
    mockGetNotificationPluginConfig.mockReturnValue(
      okAsync(
        some({
          handlers: {
            unsetChannel: vi.fn().mockReturnValue(errAsync(new NotificationError("Failed to delete scheduler event"))),
          },
        })
      )
    ); // unsetChannel is failed
    mockDeleteSchedulerEvent.mockReturnValue(okAsync(some(void 0)));
    mockDeleteAuditNotificationResourceDBProvider.mockReturnValue(okAsync(some({ id: "resource1" })));

    const result = await deleteAuditNotificationFn(input);
    expect(result.isOk()).toBe(true);
  });

  it("should return an error if deleteAuditNotification is failed", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(some({ id: "formerSchedulerEvent" })));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: mockUnsetChannel } })));
    mockDeleteSchedulerEvent.mockReturnValue(okAsync(some(void 0)));
    mockDeleteAuditNotificationResourceDBProvider.mockReturnValue(errAsync(new DBError("Failed to delete scheduler event"))); // deleteAuditNotification is failed

    const result = await deleteAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Failed to delete resource(auditNotifications) DB");
  });

  it("should return an error if user is not found", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(none)); // user not found
    // no setting is required as it will not be called
    mockGetSchedulerEvent.mockReturnValue(undefined);
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some(none)));
    mockDeleteSchedulerEvent.mockReturnValue(undefined);
    mockDeleteAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await deleteAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Request user is not found");
  });
});
