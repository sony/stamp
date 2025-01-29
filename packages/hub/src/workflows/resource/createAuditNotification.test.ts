import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { errAsync, okAsync } from "neverthrow";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuditNotification } from "./createAuditNotification";
import { CreateAuditNotificationInput } from "./input";

describe("createAuditNotification", () => {
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
  const mockCreateAuditNotificationResourceDBProvider = vi.fn();
  const mockGetUserProvider = vi.fn();
  const mockGetGroupMemberShip = vi.fn().mockReturnValue(okAsync(some({})));
  const mockGetNotificationPluginConfig = vi.fn();
  const mockCreateSchedulerEvent = vi.fn();
  const mockDeleteSchedulerEvent = vi.fn();
  const mockSetChannel = vi.fn().mockReturnValue(okAsync(none));
  const mockUnsetChannel = vi.fn().mockReturnValue(okAsync(none));

  const createAuditNotificationFn = createAuditNotification({
    logger: logger,
    getCatalogDBProvider: mockGetCatalogDBProvider,
    getCatalogConfigProvider: mockGetCatalogConfigProvider,
    getResourceDBProvider: mockGetResourceDBProvider,
    createAuditNotificationResourceDBProvider: mockCreateAuditNotificationResourceDBProvider,
    getGroupMemberShip: mockGetGroupMemberShip,
    getUserProvider: mockGetUserProvider,
    getNotificationPluginConfig: mockGetNotificationPluginConfig,
    createSchedulerEvent: mockCreateSchedulerEvent,
    deleteSchedulerEvent: mockDeleteSchedulerEvent,
  });

  const input: CreateAuditNotificationInput = {
    catalogId: "catalog1",
    resourceTypeId: "resourceType1",
    resourceId: "resource1",
    requestUserId: "f47ac10b-58cc-4372-a567-0e02b2c3d479", // random UUID
    notificationParam: {
      typeId: "type1",
      channelProperties: {},
      cronExpression: "* * * * *",
    },
  };

  const baseGetResourceDBProvider = {
    id: "resource1",
    catalogId: "catalog1",
    ownerGroupId: "eea40d50-fdff-194b-5690-9ff1b5df55c8", // random UUID
  };

  it("should return an error if input parsing fails", async () => {
    const invalidInput = {} as CreateAuditNotificationInput; // Invalid input
    const result = await createAuditNotificationFn(invalidInput);
    expect(result.isOk()).toBe(false);
  });

  it("should return an error if resource already has an audit notification", async () => {
    mockGetResourceDBProvider.mockReturnValue(
      okAsync(
        some({
          ...baseGetResourceDBProvider,
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
          ], // auditNotifications is exist
        })
      )
    );
    // no setting is required as it will not be called
    mockGetUserProvider.mockReturnValue(undefined);
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some(none)));
    mockCreateSchedulerEvent.mockReturnValue(undefined);
    mockDeleteSchedulerEvent.mockReturnValue(undefined);
    mockCreateAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await createAuditNotificationFn(input);
    expect(result.isOk()).toBe(false);
    expect(result._unsafeUnwrapErr().message).toBe("Audit Notification already exists");
  });

  it("should create a new audit notification when resource does not have one", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { setChannel: mockSetChannel } })));
    mockCreateSchedulerEvent.mockReturnValue(okAsync(some({ id: "testSchedulerEvent" })));
    mockDeleteSchedulerEvent.mockReturnValue(undefined); // no setting is required as it will not be called
    mockCreateAuditNotificationResourceDBProvider.mockReturnValue(okAsync(some({ id: "resource1" })));

    const result = await createAuditNotificationFn(input);
    expect(result.isOk()).toBe(true);
  });

  it("should return an error if createSchedulerEvent is failed", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some(none))); // no setting is required as it will not be called
    const schedulerErrorMessage = "Failed to create scheduler event";
    mockCreateSchedulerEvent.mockReturnValue(errAsync(new SchedulerError(schedulerErrorMessage, schedulerErrorMessage))); // createSchedulerEvent is failed
    // no setting is required as it will not be called
    mockDeleteSchedulerEvent.mockReturnValue(undefined);
    mockCreateAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await createAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe(schedulerErrorMessage);
  });

  it("should return an error if setChannel is failed", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetNotificationPluginConfig.mockReturnValue(
      okAsync(
        some({
          handlers: {
            setChannel: vi.fn().mockReturnValue(errAsync(new NotificationError("Failed to set channel event"))),
          },
        })
      )
    ); // setChannel is failed
    mockCreateSchedulerEvent.mockReturnValue(okAsync({ id: "testSchedulerEvent" }));
    mockDeleteSchedulerEvent.mockReturnValue(okAsync(void 0));
    mockCreateAuditNotificationResourceDBProvider.mockReturnValue(undefined); // no setting is required as it will not be called

    const result = await createAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Failed to set channel notification(rollback successful)");
    expect(mockCreateSchedulerEvent).toBeCalledTimes(1); // call for create
    expect(mockDeleteSchedulerEvent).toBeCalledTimes(1); // call for rollback
    expect(mockCreateSchedulerEvent).toHaveBeenCalledWith({
      eventType: "Notification",
      property: {
        notificationCategory: "ResourceAudit",
        catalogId: "catalog1",
        resourceTypeId: "resourceType1",
        resourceId: "resource1",
        notificationTypeId: "type1",
        channelProperties: "{}",
      },
      schedulePattern: { type: "cron", expression: "* * * * *" },
    }); // call with create
    expect(mockDeleteSchedulerEvent).toHaveBeenCalledWith({ id: "testSchedulerEvent" }); // call with rollback
  });

  it("should return an error if setChannel is failed(and rollback also failed)", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetNotificationPluginConfig.mockReturnValue(
      okAsync(
        some({
          handlers: {
            setChannel: vi.fn().mockReturnValue(errAsync(new NotificationError("Failed to set channel event"))),
          },
        })
      )
    ); // setChannel is failed
    mockCreateSchedulerEvent.mockReturnValue(okAsync({ id: "testSchedulerEvent" }));
    const schedulerErrorMessage = "Failed to delete scheduler event";
    mockDeleteSchedulerEvent.mockReturnValue(errAsync(new SchedulerError(schedulerErrorMessage, schedulerErrorMessage)));
    mockCreateAuditNotificationResourceDBProvider.mockReturnValue(undefined); // no setting is required as it will not be called

    const result = await createAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe(schedulerErrorMessage);
    expect(mockCreateSchedulerEvent).toBeCalledTimes(1); // call for create
    expect(mockDeleteSchedulerEvent).toBeCalledTimes(1); // call for rollback
  });

  it("should return an error if createAuditNotification is failed", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetNotificationPluginConfig.mockReturnValue(
      okAsync(
        some({
          handlers: {
            setChannel: mockSetChannel,
            unsetChannel: mockUnsetChannel,
          },
        })
      )
    ); // need to unsetChannel on rollback
    mockCreateSchedulerEvent.mockReturnValue(okAsync({ id: "testSchedulerEvent" }));
    mockDeleteSchedulerEvent.mockReturnValue(okAsync(void 0));
    mockCreateAuditNotificationResourceDBProvider.mockReturnValue(errAsync(new DBError("Failed to create audit notification DB"))); // createAuditNotification is failed

    const result = await createAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Failed to create resource(auditNotifications) DB(rollback successful)");
    expect(mockCreateSchedulerEvent).toBeCalledTimes(1); // call for create
    expect(mockDeleteSchedulerEvent).toBeCalledTimes(1); // call for rollback
    expect(mockCreateSchedulerEvent).toHaveBeenCalledWith({
      eventType: "Notification",
      property: {
        notificationCategory: "ResourceAudit",
        catalogId: "catalog1",
        resourceTypeId: "resourceType1",
        resourceId: "resource1",
        notificationTypeId: "type1",
        channelProperties: "{}",
      },
      schedulePattern: { type: "cron", expression: "* * * * *" },
    }); // call with create
    expect(mockDeleteSchedulerEvent).toHaveBeenCalledWith({ id: "testSchedulerEvent" }); // call with rollback
    expect(mockSetChannel).toBeCalledTimes(1); // call with create
    expect(mockUnsetChannel).toBeCalledTimes(1); // call with rollback
  });

  it("should return an error if createAuditNotification is failed(and rollback also failed)", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetNotificationPluginConfig.mockReturnValue(
      okAsync(
        some({
          handlers: {
            setChannel: mockSetChannel,
            unsetChannel: mockUnsetChannel,
          },
        })
      )
    ); // need to unsetChannel on rollback
    mockCreateSchedulerEvent.mockReturnValue(okAsync({ id: "testSchedulerEvent" }));
    const schedulerErrorMessage = "Failed to delete scheduler event";
    mockDeleteSchedulerEvent.mockReturnValue(errAsync(new SchedulerError(schedulerErrorMessage, schedulerErrorMessage)));
    mockCreateAuditNotificationResourceDBProvider.mockReturnValue(errAsync(new DBError("Failed to create audit notification DB"))); // createAuditNotification is failed

    const result = await createAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe(schedulerErrorMessage);
    expect(mockCreateSchedulerEvent).toBeCalledTimes(1); // call for create
    expect(mockDeleteSchedulerEvent).toBeCalledTimes(1); // call for rollback
    expect(mockSetChannel).toBeCalledTimes(1); // call with create
    expect(mockUnsetChannel).toBeCalledTimes(0); // not called because rollback is failed
  });

  it("should return an error if notification type ID not found in notification plugin", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(none)); // notification type ID not found in notification plugin
    // no setting is required as it will not be called
    mockCreateSchedulerEvent.mockReturnValue(undefined);
    mockDeleteSchedulerEvent.mockReturnValue(undefined);
    mockCreateAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await createAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Request notification Type ID is not found");
  });

  it("should return an error if user is not found", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(none)); // user not found
    // no setting is required as it will not be called
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some(none)));
    mockCreateSchedulerEvent.mockReturnValue(undefined);
    mockDeleteSchedulerEvent.mockReturnValue(undefined);
    mockCreateAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await createAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Request user is not found");
  });
});
