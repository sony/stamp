import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { ConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { CatalogConfig, ResourceTypeConfig, SchedulerEvent } from "@stamp-lib/stamp-types/models";
import { DBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { IdentityProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { notificationEventHandler } from "./notification";

describe("notificationEventHandler", () => {
  const resourceTypeConfig: ResourceTypeConfig = {
    id: "resourceType1",
    name: "resourceType1",
    description: "resourceType1",
    createParams: [],
    infoParams: [],
    handlers: {
      createResource: vi.fn(),
      deleteResource: vi.fn(),
      getResource: vi.fn().mockReturnValue(okAsync(some({ resourceId: "resource1", name: "resource1", params: {} }))),
      updateResource: vi.fn(),
      listResources: vi.fn(),
      listResourceAuditItem: vi.fn().mockReturnValue(okAsync({ auditItems: [{ values: ["test value"], type: "permission", name: "test" }] })),
    },
    isCreatable: false,
    isUpdatable: false,
    isDeletable: false,
    ownerManagement: true,
    approverManagement: false,
  };

  const catalogConfig: CatalogConfig = {
    id: "test-catalog-id",
    name: "test-catalog-name",
    description: "test-catalog-description",
    approvalFlows: [],
    resourceTypes: [resourceTypeConfig],
  };

  const mockGetNotificationPlugin = vi.fn();
  const mockConfigProvider: ConfigProvider = {
    approvalFlow: {
      getInfo: vi.fn(),
      listInfoByCatalogId: vi.fn(),
    },
    catalogInfo: {
      get: vi.fn(),
      list: vi.fn(),
    },
    catalogConfig: {
      get: vi.fn().mockReturnValue(okAsync(some(catalogConfig))),
    },
    notificationPlugin: {
      get: mockGetNotificationPlugin,
      list: vi.fn(),
    },
  };

  const getResourceDBProvider = vi.fn().mockReturnValue(
    okAsync(
      some({
        name: "test-resource-name",
        params: [],
        id: "test-resource-id",
        catalogId: "test-catalog-id",
        resourceTypeId: "resourceType1",
      })
    )
  );

  const mockDBProvider: DBProvider = {
    approvalFlowDB: {
      getById: vi.fn(),
      listByCatalogId: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    },
    approvalRequestDB: {
      getById: vi.fn(),
      set: vi.fn(),
      listByApprovalFlowId: vi.fn(),
      listByRequestUserId: vi.fn(),
      listByApproverId: vi.fn(),
    },
    catalogDB: {
      getById: vi.fn(),
      listAll: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    },
    resourceDB: {
      set: vi.fn(),
      getById: getResourceDBProvider,
      delete: vi.fn(),
    },
  };

  const mockIdentityProvider: IdentityProvider = {
    accountLink: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      listByUserId: vi.fn(),
      deleteAllByUserId: vi.fn(),
    },
    accountLinkSession: {
      get: vi.fn(),
      start: vi.fn(),
      delete: vi.fn(),
    },
    group: {
      get: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    groupMemberShip: {
      get: vi.fn(),
      listByGroup: vi.fn(),
      listByUser: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      get: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    admin: {
      isAdmin: vi.fn(),
    },
  };

  const notificationEventHandlerFn = notificationEventHandler({
    db: mockDBProvider,
    config: mockConfigProvider,
    identity: mockIdentityProvider,
    logger: createLogger("DEBUG", { moduleName: "hub" }),
  });

  const baseSchedulerEvent: SchedulerEvent = {
    id: "test-event-id",
    eventType: "test-event-type",
    property: {
      notificationCategory: "",
      catalogId: "test-catalog-id",
      resourceId: "test-resource-id",
      resourceTypeId: "resourceType1",
      channelProperties: JSON.stringify({ channelId: "test-channel-id", customMessage: "test-message" }),
      notificationTypeId: "test-notification-type-id",
    },
    schedulePattern: { type: "cron", expression: "test-schedule-value" },
  };

  it("should return an error if input parsing fails", async () => {
    const schedulerEvent: SchedulerEvent = {
      ...baseSchedulerEvent,
      property: {
        ...baseSchedulerEvent.property,
        notificationCategory: "ResourceAudit2", // not ResourceAudit
      },
    };

    const result = await notificationEventHandlerFn(schedulerEvent);
    expect(result.isOk()).toBe(false);
  });

  it("should handle ResourceAudit notification successfully", async () => {
    const schedulerEvent: SchedulerEvent = {
      ...baseSchedulerEvent,
      property: {
        ...baseSchedulerEvent.property,
        notificationCategory: "ResourceAudit",
      },
    };

    mockGetNotificationPlugin.mockReturnValue(
      okAsync(
        some({
          id: "test",
          name: "slack",
          description: "test",
          channelConfigProperties: [{ type: "test", description: "test", id: "test", name: "test" }],
          handlers: {
            setChannel: vi.fn(),
            unsetChannel: vi.fn(),
            sendNotification: vi.fn().mockReturnValue(okAsync(0)),
          },
        })
      )
    );
    const result = await notificationEventHandlerFn(schedulerEvent);
    expect(result.isOk()).toBe(true);
  });

  it("should return an error if notification not have notification plugin", async () => {
    const schedulerEvent: SchedulerEvent = {
      ...baseSchedulerEvent,
      property: {
        ...baseSchedulerEvent.property,
        notificationCategory: "ResourceAudit",
      },
    };

    mockGetNotificationPlugin.mockReturnValue(okAsync(none)); // not have notification plugin

    const result = await notificationEventHandlerFn(schedulerEvent);
    expect(result.isOk()).toBe(false);
    expect(result._unsafeUnwrapErr().message).toBe("Request notification Type ID is not found");
  });
});
