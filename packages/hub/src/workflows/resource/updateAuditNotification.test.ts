import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { SchedulerError } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { errAsync, okAsync } from "neverthrow";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UpdateAuditNotificationInput } from "./input";
import { updateAuditNotification } from "./updateAuditNotification";

describe("updateAuditNotification", () => {
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
  const mockUpdateAuditNotificationResourceDBProvider = vi.fn();
  const mockGetUserProvider = vi.fn();
  const mockGetGroupMemberShip = vi.fn().mockReturnValue(okAsync(some({})));
  const mockGetNotificationPluginConfig = vi.fn();
  const mockUpdateSchedulerEvent = vi.fn();
  const mockGetSchedulerEvent = vi.fn();
  const mockSetChannel = vi.fn().mockReturnValue(okAsync(none));
  const mockUnsetChannel = vi.fn().mockReturnValue(okAsync(none));

  const updateAuditNotificationFn = updateAuditNotification({
    logger: logger,
    getCatalogDBProvider: mockGetCatalogDBProvider,
    getCatalogConfigProvider: mockGetCatalogConfigProvider,
    getResourceDBProvider: mockGetResourceDBProvider,
    updateAuditNotificationResourceDBProvider: mockUpdateAuditNotificationResourceDBProvider,
    getGroupMemberShip: mockGetGroupMemberShip,
    getUserProvider: mockGetUserProvider,
    getNotificationPluginConfig: mockGetNotificationPluginConfig,
    updateSchedulerEvent: mockUpdateSchedulerEvent,
    getSchedulerEvent: mockGetSchedulerEvent,
  });

  const input: UpdateAuditNotificationInput = {
    catalogId: "catalog1",
    resourceTypeId: "resourceType1",
    resourceId: "resource1",
    requestUserId: "f47ac10b-58cc-4372-a567-0e02b2c3d479", // random UUID
    auditNotificationId: "notification1",
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
    auditNotifications: [
      {
        id: "notification1",
        notificationChannel: {
          id: "testChannel1",
          typeId: "test",
          properties: {},
        },
        schedulerEventId: "testSchedulerEvent",
        cronExpression: "* * * * *",
      },
    ],
  };

  it("should return an error if input parsing fails", async () => {
    const invalidInput = {} as UpdateAuditNotificationInput; // Invalid input
    const result = await updateAuditNotificationFn(invalidInput);
    expect(result.isErr()).toBe(true);
  });

  it("should update audit notification successfully if target audit notification exist", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(some({ id: "formerSchedulerEvent" })));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { setChannel: mockSetChannel } })));
    mockUpdateSchedulerEvent.mockReturnValue(okAsync(some({ id: "testSchedulerEvent" })));
    mockUpdateAuditNotificationResourceDBProvider.mockReturnValue(okAsync(some({ id: "resource1" })));

    const result = await updateAuditNotificationFn(input);
    expect(result.isOk()).toBe(true);
    // call with update
    expect(mockUpdateSchedulerEvent).toBeCalledTimes(1);
    expect(mockUpdateAuditNotificationResourceDBProvider).toBeCalledTimes(1);
    expect(mockSetChannel).toBeCalledTimes(1);
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
    mockUpdateSchedulerEvent.mockReturnValue(undefined);
    mockUpdateAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await updateAuditNotificationFn(input);
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
    mockUpdateSchedulerEvent.mockReturnValue(undefined);
    mockUpdateAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await updateAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Audit Notification is not set");
  });

  it("should return an error if getSchedulerEvent is failed", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(errAsync(new SchedulerError("Failed to get scheduler event"))); // getSchedulerEvent is failed
    // no setting is required as it will not be called
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some(none)));
    mockUpdateSchedulerEvent.mockReturnValue(undefined);
    mockUpdateAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await updateAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Failed to get scheduler event");
  });

  it("should return an error if return value of getSchedulerEvent is none", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(none)); // return value of getSchedulerEvent is none
    // no setting is required as it will not be called
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some(none)));
    mockUpdateSchedulerEvent.mockReturnValue(undefined);
    mockUpdateAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await updateAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Scheduler event is not found");
  });

  it("should return an error if updateSchedulerEvent is failed", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(some({ id: "formerSchedulerEvent" })));
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some(none))); // no setting is required as it will not be called
    const schedulerErrorMessage = "Failed to update scheduler event";
    mockUpdateSchedulerEvent.mockReturnValue(errAsync(new SchedulerError(schedulerErrorMessage, schedulerErrorMessage))); // updateSchedulerEvent is failed
    mockUpdateAuditNotificationResourceDBProvider.mockReturnValue(undefined); // no setting is required as it will not be called

    const result = await updateAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe(schedulerErrorMessage);
  });

  it("should return an error if setChannel is failed", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(some({ id: "formerSchedulerEvent" })));
    mockGetNotificationPluginConfig.mockReturnValue(
      okAsync(
        some({
          handlers: {
            setChannel: vi.fn().mockReturnValue(errAsync(new NotificationError("Failed to set channel event"))),
          },
        })
      )
    ); // setChannel is failed
    mockUpdateSchedulerEvent.mockReturnValueOnce(okAsync(some({ id: "testSchedulerEvent" }))); // update
    mockUpdateSchedulerEvent.mockReturnValueOnce(okAsync(some({ id: "formerSchedulerEvent" }))); // rollback
    mockUpdateAuditNotificationResourceDBProvider.mockReturnValue(undefined); // no setting is required as it will not be called

    const result = await updateAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Failed to set channel notification(rollback successful)");
    expect(mockUpdateSchedulerEvent).toBeCalledTimes(2); // call for update and rollback
    expect(mockUpdateSchedulerEvent).toHaveBeenNthCalledWith(1, {
      id: "testSchedulerEvent",
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
    }); // call with update
    expect(mockUpdateSchedulerEvent).toHaveBeenNthCalledWith(2, { id: "formerSchedulerEvent" }); // call with rollback
  });

  it("should return an error if setChannel is failed(and rollback also failed)", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(some({ id: "formerSchedulerEvent" })));
    mockGetNotificationPluginConfig.mockReturnValue(
      okAsync(
        some({
          handlers: {
            setChannel: vi.fn().mockReturnValue(errAsync(new NotificationError("Failed to set channel event"))),
          },
        })
      )
    ); // setChannel is failed
    mockUpdateSchedulerEvent.mockReturnValueOnce(okAsync(some({ id: "testSchedulerEvent" }))); // update
    const schedulerErrorMessage = "Failed to update scheduler event";
    mockUpdateSchedulerEvent.mockReturnValueOnce(errAsync(new SchedulerError(schedulerErrorMessage, schedulerErrorMessage))); // rollback is failed
    mockUpdateAuditNotificationResourceDBProvider.mockReturnValue(undefined); // no setting is required as it will not be called

    const result = await updateAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe(schedulerErrorMessage);
    expect(mockUpdateSchedulerEvent).toBeCalledTimes(2); // call for update and rollback
  });

  it("should return an error if updateAuditNotification is failed", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(some({ id: "formerSchedulerEvent" })));
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
    mockUpdateSchedulerEvent.mockReturnValueOnce(okAsync(some({ id: "testSchedulerEvent" }))); // update
    mockUpdateSchedulerEvent.mockReturnValueOnce(okAsync(some({ id: "formerSchedulerEvent" }))); // rollback
    mockUpdateAuditNotificationResourceDBProvider.mockReturnValue(errAsync(new DBError("Failed to update scheduler event"))); // updateAuditNotification is failed

    const result = await updateAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Failed to update resource(auditNotifications) DB(rollback successful)");
    expect(mockUpdateSchedulerEvent).toBeCalledTimes(2); // call for update and rollback
    expect(mockUpdateSchedulerEvent).toHaveBeenNthCalledWith(1, {
      id: "testSchedulerEvent",
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
    }); // call with update
    expect(mockUpdateSchedulerEvent).toHaveBeenNthCalledWith(2, { id: "formerSchedulerEvent" }); // call with rollback
    expect(mockSetChannel).toBeCalledTimes(1); // call with update
    expect(mockUnsetChannel).toBeCalledTimes(1); // call with rollback
  });

  it("should return an error if updateAuditNotification is failed(and rollback also failed)", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(okAsync(some({ id: "formerSchedulerEvent" })));
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
    mockUpdateSchedulerEvent.mockReturnValueOnce(okAsync(some({ id: "testSchedulerEvent" }))); // update
    const schedulerErrorMessage = "Failed to update scheduler event";
    mockUpdateSchedulerEvent.mockReturnValueOnce(errAsync(new SchedulerError(schedulerErrorMessage, schedulerErrorMessage))); // rollback is failed
    mockUpdateAuditNotificationResourceDBProvider.mockReturnValue(errAsync(new DBError("Failed to update scheduler event"))); // updateAuditNotification is failed

    const result = await updateAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe(schedulerErrorMessage);
    expect(mockUpdateSchedulerEvent).toBeCalledTimes(2); // call for update and rollback
    expect(mockSetChannel).toBeCalledTimes(1); // call with update
    expect(mockUnsetChannel).toBeCalledTimes(0); // not called because rollback is failed
  });

  it("should return an error if notification type ID not found in notification plugin", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(some({ userName: "test-user", email: "test@test.com" })));
    mockGetSchedulerEvent.mockReturnValue(undefined);
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(none)); // notification type ID not found in notification plugin
    // no setting is required as it will not be called
    mockUpdateSchedulerEvent.mockReturnValue(undefined);
    mockUpdateAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await updateAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Request notification Type ID is not found");
  });

  it("should return an error if user is not found", async () => {
    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockGetUserProvider.mockReturnValue(okAsync(none)); // user not found
    // no setting is required as it will not be called
    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some(none)));
    mockUpdateSchedulerEvent.mockReturnValue(undefined);
    mockUpdateAuditNotificationResourceDBProvider.mockReturnValue(undefined);

    const result = await updateAuditNotificationFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Request user is not found");
  });
});
