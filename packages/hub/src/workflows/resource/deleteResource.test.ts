import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { CatalogDBProvider, DBError, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { NotificationError } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { SchedulerError, SchedulerProvider } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import { errAsync, okAsync } from "neverthrow";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteResource } from "./deleteResource";
import { DeleteResourceInput } from "./input";

const ownerGroupId = "96fc6a4c-b5d3-8c2b-0307-165168a023cd"; // uuid is meaningless and was generated for testing.

describe("deleteResource", () => {
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
    id: "test-resource-type-id",
    name: "test resource type",
    description: "test resource type",
    createParams: [],
    infoParams: [],
    handlers: {
      createResource: vi.fn(),
      deleteResource: vi.fn().mockReturnValue(okAsync(void 0)),
      getResource: vi.fn().mockReturnValue(
        okAsync(
          some({
            resourceId: "112233445566",
            name: "test-resource",
            parentResourceId: "123456789012",
            params: {},
          })
        )
      ),
      updateResource: vi.fn(),
      listResources: vi.fn(),
      listResourceAuditItem: vi.fn(),
    },
    parentResourceTypeId: "test-parent-resource-type-id",
    isCreatable: false,
    isUpdatable: false,
    isDeletable: false,
    ownerManagement: true,
    approverManagement: true,
  };

  const mockGetCatalogDBProvider = vi.fn();
  const catalogDbProvider: CatalogDBProvider = {
    getById: mockGetCatalogDBProvider,
    listAll: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  const mockGetResourceDBProvider = vi.fn();
  const mockDeleteResourceDBProvider = vi.fn();
  const resourceDBProvider: ResourceDBProvider = {
    getById: mockGetResourceDBProvider,
    set: vi.fn(),
    delete: mockDeleteResourceDBProvider,
    createAuditNotification: vi.fn(),
    updateAuditNotification: vi.fn(),
    deleteAuditNotification: vi.fn(),
  };

  const mockGetGroupMemberShip = vi.fn().mockReturnValue(okAsync(some({})));
  const mockGetNotificationPluginConfig = vi.fn();
  const mockUnsetChannel = vi.fn().mockReturnValue(okAsync({}));

  const mockGetCatalogConfigProvider = vi.fn();
  const catalogConfigProvider: CatalogConfigProvider = {
    get: mockGetCatalogConfigProvider,
  };

  const mockGetSchedulerProvider = vi.fn();
  const mockDeleteSchedulerProvider = vi.fn();
  const schedulerProvider: SchedulerProvider = {
    getSchedulerEvent: mockGetSchedulerProvider,
    createSchedulerEvent: vi.fn(),
    updateSchedulerEvent: vi.fn(),
    deleteSchedulerEvent: mockDeleteSchedulerProvider,
  };

  const input: DeleteResourceInput = {
    catalogId: "test-catalog-id",
    resourceTypeId: "test-resource-type-id",
    resourceId: "112233445566",
    requestUserId: "47f29c51-204c-09f6-2069-f3df073568c7", // random uuid
  };

  const baseGetResourceDBProvider = {
    ownerGroupId: ownerGroupId,
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

  const deleteResourceFn = deleteResource(
    logger,
    catalogDbProvider,
    catalogConfigProvider,
    resourceDBProvider,
    mockGetGroupMemberShip,
    mockGetNotificationPluginConfig
  );

  const deleteResourceWithSchedulerFn = deleteResource(
    logger,
    catalogDbProvider,
    catalogConfigProvider,
    resourceDBProvider,
    mockGetGroupMemberShip,
    mockGetNotificationPluginConfig,
    schedulerProvider
  );

  it("should delete resources successfully when auditNotifications does not exist", async () => {
    mockGetCatalogConfigProvider.mockReturnValue(
      okAsync(
        some({
          ...baseCatalogConfig,
          resourceTypes: [baseResourceTypeConfig],
        })
      )
    );

    mockGetResourceDBProvider.mockReturnValue(okAsync(some({ ...baseGetResourceDBProvider, auditNotifications: undefined })));
    mockDeleteResourceDBProvider.mockReturnValue(okAsync(void 0));

    mockGetNotificationPluginConfig.mockReturnValue(okAsync(none)); // No setting is required as it will not be called
    mockGetCatalogDBProvider.mockReturnValue(okAsync(some({ ownerGroupId: ownerGroupId })));
    // No setting is required as it will not be called
    mockGetSchedulerProvider.mockReturnValue(undefined);
    mockDeleteSchedulerProvider.mockReturnValue(undefined);

    const result = await deleteResourceFn(input);
    expect(result.isOk()).toBe(true);
    // Because delete resource failed, following will not be called
    expect(mockGetNotificationPluginConfig).toHaveBeenCalledTimes(0);
    expect(mockGetSchedulerProvider).toHaveBeenCalledTimes(0);
    expect(mockDeleteSchedulerProvider).toHaveBeenCalledTimes(0);
  });

  it("should delete resources successfully when getResourceDB returns none", async () => {
    mockGetCatalogConfigProvider.mockReturnValue(
      okAsync(
        some({
          ...baseCatalogConfig,
          resourceTypes: [baseResourceTypeConfig],
        })
      )
    );
    // Only ownerGroupId is checked in isParentResourceOwnerImpl
    mockGetResourceDBProvider.mockReturnValueOnce(okAsync(some(baseGetResourceDBProvider)));
    mockGetResourceDBProvider.mockReturnValueOnce(okAsync(some(baseGetResourceDBProvider)));
    mockGetResourceDBProvider.mockReturnValueOnce(okAsync(none));
    mockDeleteResourceDBProvider.mockReturnValue(okAsync(void 0));

    mockGetNotificationPluginConfig.mockReturnValue(okAsync(none)); // No setting is required as it will not be called
    mockGetCatalogDBProvider.mockReturnValue(okAsync(some({ ownerGroupId: ownerGroupId })));
    // No setting is required as it will not be called
    mockGetSchedulerProvider.mockReturnValue(undefined);
    mockDeleteSchedulerProvider.mockReturnValue(undefined);

    const result = await deleteResourceFn(input);
    expect(result.isOk()).toBe(true);
    expect(mockGetResourceDBProvider).toHaveBeenCalledTimes(3);
  });

  it("should return an error if does not have permission", async () => {
    mockGetCatalogConfigProvider.mockReturnValue(
      okAsync(
        some({
          ...baseCatalogConfig,
          resourceTypes: [baseResourceTypeConfig],
        })
      )
    );
    mockGetResourceDBProvider.mockReturnValue(okAsync(none)); // No permission setting
    mockDeleteResourceDBProvider.mockReturnValue(okAsync(void 0));

    mockGetNotificationPluginConfig.mockReturnValue(okAsync(none)); // No setting is required as it will not be called
    mockGetCatalogDBProvider.mockReturnValue(okAsync(some({ ownerGroupId: "" }))); // No permission setting
    // No setting is required as it will not be called
    mockGetSchedulerProvider.mockReturnValue(undefined);
    mockDeleteSchedulerProvider.mockReturnValue(undefined);

    const result = await deleteResourceFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("Permission denied");
    expect(mockDeleteResourceDBProvider).toHaveBeenCalledTimes(0); // Not called because no permission
  });

  it("should return an error if target resourceType does not exist", async () => {
    mockGetCatalogConfigProvider.mockReturnValue(
      okAsync(
        some({
          ...baseCatalogConfig,
          resourceTypes: [], // No resourceTypes
        })
      )
    );

    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockDeleteResourceDBProvider.mockReturnValue(okAsync(void 0));

    mockGetNotificationPluginConfig.mockReturnValue(okAsync(none)); // No setting is required as it will not be called
    mockGetCatalogDBProvider.mockReturnValue(okAsync(some({ ownerGroupId: ownerGroupId })));
    // No setting is required as it will not be called
    mockGetSchedulerProvider.mockReturnValue(undefined);
    mockDeleteSchedulerProvider.mockReturnValue(undefined);

    const result = await deleteResourceFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("ResourceType not found");
    expect(mockDeleteResourceDBProvider).toHaveBeenCalledTimes(0); // Not called because resourceType does not exist
  });

  it("should delete resources successfully when audit Notifications exist and Stamp have notification plugin", async () => {
    mockGetCatalogConfigProvider.mockReturnValue(
      okAsync(
        some({
          ...baseCatalogConfig,
          resourceTypes: [baseResourceTypeConfig],
        })
      )
    );

    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockDeleteResourceDBProvider.mockReturnValue(okAsync(void 0));

    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: mockUnsetChannel } })));
    mockGetCatalogDBProvider.mockReturnValue(okAsync(some({ ownerGroupId: ownerGroupId })));

    mockGetSchedulerProvider.mockReturnValue(okAsync(some({ id: "notification1" })));
    mockDeleteSchedulerProvider.mockReturnValue(okAsync(void 0));

    const result = await deleteResourceWithSchedulerFn(input);
    expect(result.isOk()).toBe(true);
    expect(mockGetSchedulerProvider).toHaveBeenCalledWith({ id: "testSchedulerEvent" });
    // Called because auditNotifications exists
    expect(mockGetSchedulerProvider).toHaveBeenCalledTimes(1);
    expect(mockDeleteSchedulerProvider).toHaveBeenCalledTimes(1);
    expect(mockGetNotificationPluginConfig).toHaveBeenCalledTimes(1);
    expect(mockUnsetChannel).toHaveBeenCalledTimes(1);
  });

  it("should delete resources successfully when audit Notifications exist and Stamp not have notification plugin", async () => {
    mockGetCatalogConfigProvider.mockReturnValue(
      okAsync(
        some({
          ...baseCatalogConfig,
          resourceTypes: [baseResourceTypeConfig],
        })
      )
    );

    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockDeleteResourceDBProvider.mockReturnValue(okAsync(void 0));

    mockGetNotificationPluginConfig.mockReturnValue(okAsync(none)); // not have notification plugin
    mockGetCatalogDBProvider.mockReturnValue(okAsync(some({ ownerGroupId: ownerGroupId })));

    mockGetSchedulerProvider.mockReturnValue(okAsync(some({ id: "notification1" })));
    mockDeleteSchedulerProvider.mockReturnValue(okAsync(void 0));

    const result = await deleteResourceWithSchedulerFn(input);
    expect(result.isOk()).toBe(true);
    // No notification plugin, but scheduler deletion is performed
    expect(mockGetNotificationPluginConfig).toHaveBeenCalledTimes(1);
    expect(mockGetSchedulerProvider).toHaveBeenCalledTimes(1);
    expect(mockDeleteSchedulerProvider).toHaveBeenCalledTimes(1);
  });

  it("should delete resources successfully when getSchedulerEvent is failed", async () => {
    mockGetCatalogConfigProvider.mockReturnValue(
      okAsync(
        some({
          ...baseCatalogConfig,
          resourceTypes: [baseResourceTypeConfig],
        })
      )
    );

    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockDeleteResourceDBProvider.mockReturnValue(okAsync(void 0));

    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: mockUnsetChannel } })));
    mockGetCatalogDBProvider.mockReturnValue(okAsync(some({ ownerGroupId: ownerGroupId })));

    mockGetSchedulerProvider.mockReturnValue(errAsync(new SchedulerError("Failed to get scheduler event"))); // getSchedulerEvent is failed
    mockDeleteSchedulerProvider.mockReturnValue(okAsync(void 0));

    const result = await deleteResourceWithSchedulerFn(input);
    expect(result.isOk()).toBe(true);
    // Because getSchedulerEvent failed, following will not be called
    expect(mockGetNotificationPluginConfig).toHaveBeenCalledTimes(0);
    expect(mockUnsetChannel).toHaveBeenCalledTimes(0);
    expect(mockDeleteSchedulerProvider).toHaveBeenCalledTimes(0);
  });

  it("should delete resources successfully when getSchedulerEvent returns none", async () => {
    mockGetCatalogConfigProvider.mockReturnValue(
      okAsync(
        some({
          ...baseCatalogConfig,
          resourceTypes: [baseResourceTypeConfig],
        })
      )
    );

    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockDeleteResourceDBProvider.mockReturnValue(okAsync(void 0));

    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: mockUnsetChannel } })));
    mockGetCatalogDBProvider.mockReturnValue(okAsync(some({ ownerGroupId: ownerGroupId })));

    mockGetSchedulerProvider.mockReturnValue(okAsync(none)); // getSchedulerEvent returns none
    mockDeleteSchedulerProvider.mockReturnValue(okAsync(void 0));

    const result = await deleteResourceWithSchedulerFn(input);
    expect(result.isOk()).toBe(true);
    // Because getSchedulerEvent returns none, following will not be called
    expect(mockGetNotificationPluginConfig).toHaveBeenCalledTimes(0);
    expect(mockUnsetChannel).toHaveBeenCalledTimes(0);
    expect(mockDeleteSchedulerProvider).toHaveBeenCalledTimes(0);
  });

  it("should delete resources successfully when deleteSchedulerEvent is failed", async () => {
    mockGetCatalogConfigProvider.mockReturnValue(
      okAsync(
        some({
          ...baseCatalogConfig,
          resourceTypes: [baseResourceTypeConfig],
        })
      )
    );

    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockDeleteResourceDBProvider.mockReturnValue(okAsync(void 0));

    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: mockUnsetChannel } })));
    mockGetCatalogDBProvider.mockReturnValue(okAsync(some({ ownerGroupId: ownerGroupId })));

    mockGetSchedulerProvider.mockReturnValue(okAsync(some({ id: "notification1" })));
    mockDeleteSchedulerProvider.mockReturnValue(errAsync(new SchedulerError("Failed to delete scheduler event"))); // deleteSchedulerEvent is failed

    const result = await deleteResourceWithSchedulerFn(input);
    expect(result.isOk()).toBe(true);
    // Because deleteSchedulerEvent failed, following will not be called
    expect(mockGetNotificationPluginConfig).toHaveBeenCalledTimes(0);
    expect(mockUnsetChannel).toHaveBeenCalledTimes(0);
  });

  it("should return an error if resource delete is failed", async () => {
    mockGetCatalogConfigProvider.mockReturnValue(
      okAsync(
        some({
          ...baseCatalogConfig,
          resourceTypes: [baseResourceTypeConfig],
        })
      )
    );

    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    const schedulerErrorMessage = "Failed to delete resource DB";
    mockDeleteResourceDBProvider.mockReturnValue(errAsync(new DBError(schedulerErrorMessage))); // delete resource is failed

    mockGetNotificationPluginConfig.mockReturnValue(okAsync(some({ handlers: { unsetChannel: mockUnsetChannel } })));
    mockGetCatalogDBProvider.mockReturnValue(okAsync(some({ ownerGroupId: ownerGroupId })));

    mockGetSchedulerProvider.mockReturnValue(okAsync(some({ id: "notification1" })));
    mockDeleteSchedulerProvider.mockReturnValue(okAsync(void 0));

    const result = await deleteResourceWithSchedulerFn(input);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe(schedulerErrorMessage);
    // Because delete resource failed, following will not be called
    expect(mockGetNotificationPluginConfig).toHaveBeenCalledTimes(0);
    expect(mockUnsetChannel).toHaveBeenCalledTimes(0);
  });

  it("should delete resources successfully when unsetChannel is failed", async () => {
    mockGetCatalogConfigProvider.mockReturnValue(
      okAsync(
        some({
          ...baseCatalogConfig,
          resourceTypes: [baseResourceTypeConfig],
        })
      )
    );

    mockGetResourceDBProvider.mockReturnValue(okAsync(some(baseGetResourceDBProvider)));
    mockDeleteResourceDBProvider.mockReturnValue(okAsync(void 0));

    mockGetNotificationPluginConfig.mockReturnValue(
      okAsync(
        some({
          handlers: { unsetChannel: vi.fn().mockReturnValue(errAsync(new NotificationError("Failed to unset channel event"))) },
        })
      )
    );
    mockGetCatalogDBProvider.mockReturnValue(okAsync(some({ ownerGroupId: ownerGroupId })));

    mockGetSchedulerProvider.mockReturnValue(okAsync(some({ id: "notification1" })));
    mockDeleteSchedulerProvider.mockReturnValue(okAsync(void 0));

    const result = await deleteResourceWithSchedulerFn(input);
    expect(result.isOk()).toBe(true);
  });
});
