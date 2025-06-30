import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { ResourceOnDB } from "@stamp-lib/stamp-types/models";
import {
  CreateAuditNotificationInput,
  DeleteAuditNotificationInput,
  UpdateAuditNotificationInput,
  UpdatePendingUpdateParamsInput,
} from "@stamp-lib/stamp-types/pluginInterface/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAuditNotificationImpl,
  deleteAuditNotificationImpl,
  deleteImpl,
  getByIdImpl,
  setImpl,
  updateAuditNotificationImpl,
  updatePendingUpdateParamsImpl,
} from "./resource";

const logger = createLogger("DEBUG", { moduleName: "plugins" });
const id = "test-id-resource";
const catalogId = "test-iam-catalog-resource";
const resourceTypeId = "test-iam-resource-type";
const tableName = `${process.env.DYNAMO_TABLE_PREFIX}-dynamodb-db-Resource`;
const config = { region: "us-west-2" };
let notificationId = "";

describe("Testing resource", () => {
  beforeAll(async () => {
    await deleteImpl(logger)({ id, catalogId, resourceTypeId }, tableName, config);
  });
  afterAll(async () => {
    await deleteImpl(logger)({ id, catalogId, resourceTypeId }, tableName, config);
  });

  describe("setImpl", () => {
    it("should successfully set resource with valid input", async () => {
      const resourceInput: ResourceOnDB = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        approverGroupId: undefined,
        ownerGroupId: undefined,
      };
      const expected = structuredClone(resourceInput);
      const resultAsync = setImpl(logger)(resourceInput, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it.each([
      [
        "ID is empty",
        {
          id: "",
          catalogId: catalogId,
          resourceTypeId: resourceTypeId,
          approverGroupId: undefined,
          ownerGroupId: undefined,
        },
      ],
      [
        "catalog ID is empty",
        {
          id: id,
          catalogId: "",
          resourceTypeId: resourceTypeId,
          approverGroupId: undefined,
          ownerGroupId: undefined,
        },
      ],
      [
        "resource type ID is empty",
        {
          id: id,
          catalogId: catalogId,
          resourceTypeId: "",
          approverGroupId: undefined,
          ownerGroupId: undefined,
        },
      ],
      [
        "approver group ID is empty",
        {
          id: id,
          catalogId: catalogId,
          resourceTypeId: resourceTypeId,
          approverGroupId: "",
          ownerGroupId: undefined,
        },
      ],
      [
        "approver group ID is empty",
        {
          id: id,
          catalogId: catalogId,
          resourceTypeId: resourceTypeId,
          approverGroupId: undefined,
          ownerGroupId: "",
        },
      ],
    ])("returns failure result", async (key, resource) => {
      const resultAsync = setImpl(logger)(resource, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("createAuditNotificationImpl", () => {
    it.each([
      [
        "resource ID is empty",
        {
          id: "",
          catalogId: catalogId,
          resourceTypeId: resourceTypeId,
          schedulerEventId: "test-scheduler-event-id",
          cronExpression: "test-cron-expression",
          notificationChannel: {
            id: "test-channel-id",
            typeId: "slack",
            properties: { channelId: "test-channel-id", customMessage: "test-message" },
          },
        },
      ],
      [
        "catalog ID is empty",
        {
          id: id,
          catalogId: "",
          resourceTypeId: resourceTypeId,
          schedulerEventId: "test-scheduler-event-id",
          cronExpression: "test-cron-expression",
          notificationChannel: {
            id: "test-channel-id",
            typeId: "slack",
            properties: { channelId: "test-channel-id", customMessage: "test-message" },
          },
        },
      ],
      [
        "resource type ID is empty",
        {
          id: id,
          catalogId: catalogId,
          resourceTypeId: "",
          schedulerEventId: "test-scheduler-event-id",
          cronExpression: "test-cron-expression",
          notificationChannel: {
            id: "test-channel-id",
            typeId: "slack",
            properties: { channelId: "test-channel-id", customMessage: "test-message" },
          },
        },
      ],
    ])("returns failure result", async (key, resource) => {
      const resultAsync = createAuditNotificationImpl(logger)(resource, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("should successfully create auditNotification with valid input", async () => {
      const input: CreateAuditNotificationInput = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        schedulerEventId: "test-scheduler-event-id",
        cronExpression: "test-cron-expression",
        notificationChannel: {
          id: "test-channel-id",
          typeId: "slack",
          properties: { channelId: "test-channel-id", customMessage: "test-message" },
        },
      };
      const expected = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        auditNotifications: [
          {
            id: expect.any(String),
            schedulerEventId: "test-scheduler-event-id",
            cronExpression: "test-cron-expression",
            notificationChannel: {
              id: "test-channel-id",
              typeId: "slack",
              properties: { channelId: "test-channel-id", customMessage: "test-message" },
            },
          },
        ],
      };
      const resultAsync = createAuditNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
      if (result.value.auditNotifications) {
        notificationId = result.value.auditNotifications[0].id;
        console.log("notificationId", notificationId);
      }
    });
  });

  describe("updateAuditNotificationImpl", () => {
    it("should successfully update auditNotification with valid input", async () => {
      const input: UpdateAuditNotificationInput = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        auditNotificationId: notificationId,
        schedulerEventId: "test-update-scheduler-event-id",
        cronExpression: "test-update-cron-expression",
        notificationChannel: {
          id: "test-update-channel-id",
          typeId: "slack",
          properties: { channelId: "test-update-channel-id", customMessage: "test-update-message" },
        },
      };
      const expected = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        auditNotifications: [
          {
            id: notificationId,
            schedulerEventId: "test-update-scheduler-event-id",
            cronExpression: "test-update-cron-expression",
            notificationChannel: {
              id: "test-update-channel-id",
              typeId: "slack",
              properties: { channelId: "test-update-channel-id", customMessage: "test-update-message" },
            },
          },
        ],
      };
      const resultAsync = updateAuditNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it.each([
      [
        "resource ID is empty",
        {
          id: "",
          catalogId: catalogId,
          resourceTypeId: resourceTypeId,
          auditNotificationId: notificationId,
          schedulerEventId: "test-scheduler-event-id",
          cronExpression: "test-cron-expression",
          notificationChannel: {
            id: "test-channel-id",
            typeId: "slack",
            properties: { channelId: "test-channel-id", customMessage: "test-message" },
          },
        },
      ],
      [
        "catalog ID is empty",
        {
          id: id,
          catalogId: "",
          resourceTypeId: resourceTypeId,
          auditNotificationId: notificationId,
          schedulerEventId: "test-scheduler-event-id",
          cronExpression: "test-cron-expression",
          notificationChannel: {
            id: "test-channel-id",
            typeId: "slack",
            properties: { channelId: "test-channel-id", customMessage: "test-message" },
          },
        },
      ],
      [
        "resource type ID is empty",
        {
          id: id,
          catalogId: catalogId,
          resourceTypeId: "",
          auditNotificationId: notificationId,
          schedulerEventId: "test-scheduler-event-id",
          cronExpression: "test-cron-expression",
          notificationChannel: {
            id: "test-channel-id",
            typeId: "slack",
            properties: { channelId: "test-channel-id", customMessage: "test-message" },
          },
        },
      ],
      [
        "auditNotification ID is empty",
        {
          id: id,
          catalogId: catalogId,
          resourceTypeId: resourceTypeId,
          auditNotificationId: "",
          schedulerEventId: "test-scheduler-event-id",
          cronExpression: "test-cron-expression",
          notificationChannel: {
            id: "test-channel-id",
            typeId: "slack",
            properties: { channelId: "test-channel-id", customMessage: "test-message" },
          },
        },
      ],
    ])("returns failure result", async (key, resource) => {
      const resultAsync = updateAuditNotificationImpl(logger)(resource, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteAuditNotificationImpl", () => {
    it.each([
      [
        "resource ID is empty",
        {
          id: "",
          catalogId: catalogId,
          resourceTypeId: resourceTypeId,
          auditNotificationId: notificationId,
        },
      ],
      [
        "catalog ID is empty",
        {
          id: id,
          catalogId: "",
          resourceTypeId: resourceTypeId,
          auditNotificationId: notificationId,
        },
      ],
      [
        "resource type ID is empty",
        {
          id: id,
          catalogId: catalogId,
          resourceTypeId: "",
          auditNotificationId: notificationId,
        },
      ],
      [
        "auditNotification ID is empty",
        {
          id: id,
          catalogId: catalogId,
          resourceTypeId: resourceTypeId,
          auditNotificationId: "",
        },
      ],
    ])("returns failure result", async (key, resource) => {
      const resultAsync = deleteAuditNotificationImpl(logger)(resource, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("should successfully delete auditNotification with valid input", async () => {
      const input: DeleteAuditNotificationInput = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        auditNotificationId: notificationId,
      };
      const expected = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        auditNotifications: [],
      };
      const resultAsync = deleteAuditNotificationImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });
  });

  describe("getByIdImpl", () => {
    it("should successfully get resource with valid input", async () => {
      const input = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
      };
      const expected = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        approverGroupId: undefined,
        ownerGroupId: undefined,
        auditNotifications: [],
      };
      const resultAsync = getByIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("returns none if ID does not exist", async () => {
      const input = {
        id: "non-existent-id",
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
      };
      const resultAsync = getByIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns none if catalog ID does not exist", async () => {
      const input = {
        id: id,
        catalogId: "non-existent-catalog-id",
        resourceTypeId: resourceTypeId,
      };
      const resultAsync = getByIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns none if resource type ID does not exist", async () => {
      const input = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: "non-existent-resource-type-id",
      };
      const resultAsync = getByIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it.each([
      [
        "ID is empty",
        {
          id: "",
          catalogId: catalogId,
          resourceTypeId: resourceTypeId,
        },
      ],
      [
        "catalog ID is empty",
        {
          id: id,
          catalogId: "",
          resourceTypeId: resourceTypeId,
        },
      ],
      [
        "resource type ID is empty",
        {
          id: id,
          catalogId: catalogId,
          resourceTypeId: "",
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = getByIdImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteImpl", () => {
    it("should successfully delete resource with valid input", async () => {
      const input = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if ID does not exist", async () => {
      const input = {
        id: "non-existent-id",
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if catalog ID does not exist", async () => {
      const input = {
        id: id,
        catalogId: "non-existent-catalog-id",
        resourceTypeId: resourceTypeId,
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if resource type ID does not exist", async () => {
      const input = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: "non-existent-resource-type-id",
      };
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it.each([
      [
        "ID is empty",
        {
          id: "",
          catalogId: catalogId,
          resourceTypeId: resourceTypeId,
        },
      ],
      [
        "catalog ID is empty",
        {
          id: id,
          catalogId: "",
          resourceTypeId: resourceTypeId,
        },
      ],
      [
        "resource type ID is empty",
        {
          id: id,
          catalogId: catalogId,
          resourceTypeId: "",
        },
      ],
    ])("returns failure result", async (key, input) => {
      const resultAsync = deleteImpl(logger)(input, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("updatePendingUpdateParamsImpl", () => {
    const testPendingUpdateParams = {
      approvalRequestId: "0726a124-1003-f838-2186-915207b16a1a",
      updateParams: {
        testParam1: "value1",
        testParam2: 42,
        testParam3: true,
        testParam4: ["array", "value"],
      },
      requestUserId: "27868cc6-6a15-dd32-53c4-91933b88640f",
      requestedAt: "2023-12-01T10:00:00Z",
    };

    beforeAll(async () => {
      // Create a resource first to test pending update params
      const resourceInput: ResourceOnDB = {
        id: id,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        approverGroupId: undefined,
        ownerGroupId: undefined,
      };
      await setImpl(logger)(resourceInput, tableName, config);
    });

    it("should successfully set pending update params when provided", async () => {
      const input: UpdatePendingUpdateParamsInput = {
        id,
        catalogId,
        resourceTypeId,
        pendingUpdateParams: testPendingUpdateParams,
      };

      const resultAsync = updatePendingUpdateParamsImpl(logger)(input, tableName, config);
      const result = await resultAsync;

      if (result.isErr()) {
        throw result.error;
      }

      expect(result.value.pendingUpdateParams).toEqual(testPendingUpdateParams);
    });

    it("should successfully remove pending update params when undefined", async () => {
      // First set pending update params
      const inputSet: UpdatePendingUpdateParamsInput = {
        id,
        catalogId,
        resourceTypeId,
        pendingUpdateParams: testPendingUpdateParams,
      };
      await updatePendingUpdateParamsImpl(logger)(inputSet, tableName, config);

      // Then remove them
      const inputRemove: UpdatePendingUpdateParamsInput = {
        id,
        catalogId,
        resourceTypeId,
        pendingUpdateParams: undefined,
      };

      const resultAsync = updatePendingUpdateParamsImpl(logger)(inputRemove, tableName, config);
      const result = await resultAsync;

      if (result.isErr()) {
        throw result.error;
      }

      expect(result.value.pendingUpdateParams).toBeUndefined();
    });

    it("should return error when resource does not exist", async () => {
      const input: UpdatePendingUpdateParamsInput = {
        id: "non-existent-id",
        catalogId,
        resourceTypeId,
        pendingUpdateParams: testPendingUpdateParams,
      };

      const resultAsync = updatePendingUpdateParamsImpl(logger)(input, tableName, config);
      const result = await resultAsync;

      expect(result.isErr()).toBe(true);
    });

    it.each([
      [
        "ID is empty",
        {
          id: "",
          catalogId: catalogId,
          resourceTypeId: resourceTypeId,
          pendingUpdateParams: testPendingUpdateParams,
        },
      ],
      [
        "catalog ID is empty",
        {
          id: id,
          catalogId: "",
          resourceTypeId: resourceTypeId,
          pendingUpdateParams: testPendingUpdateParams,
        },
      ],
      [
        "resource type ID is empty",
        {
          id: id,
          catalogId: catalogId,
          resourceTypeId: "",
          pendingUpdateParams: testPendingUpdateParams,
        },
      ],
    ])("should return validation error when %s", async (description, input) => {
      const resultAsync = updatePendingUpdateParamsImpl(logger)(input, tableName, config);
      const result = await resultAsync;

      expect(result.isErr()).toBe(true);
    });

    it("should handle complex pending update params", async () => {
      const complexPendingUpdateParams = {
        approvalRequestId: "116e3c0e-04d3-0842-cbd3-d487460df082",
        updateParams: {
          stringParam: "complex string value",
          numberParam: 999,
          booleanParam: false,
          arrayParam: ["item1", "item2", "item3"],
          nestedStringParam: "another value",
        },
        requestUserId: "456fd3cf-8c74-7f56-ca72-6ca12e8437bd",
        requestedAt: "2023-12-02T15:30:45Z",
      };

      const input: UpdatePendingUpdateParamsInput = {
        id,
        catalogId,
        resourceTypeId,
        pendingUpdateParams: complexPendingUpdateParams,
      };

      const resultAsync = updatePendingUpdateParamsImpl(logger)(input, tableName, config);
      const result = await resultAsync;

      if (result.isErr()) {
        throw result.error;
      }

      expect(result.value.pendingUpdateParams).toEqual(complexPendingUpdateParams);
      expect(result.value.id).toBe(id);
      expect(result.value.catalogId).toBe(catalogId);
      expect(result.value.resourceTypeId).toBe(resourceTypeId);
    });

    it("should update existing pending update params", async () => {
      // First set initial pending update params
      const initialParams = {
        approvalRequestId: "0726a124-1003-f838-2186-915207b16a1a",
        updateParams: { param1: "initial" },
        requestUserId: "27868cc6-6a15-dd32-53c4-91933b88640f",
        requestedAt: "2023-12-01T00:00:00Z",
      };

      const inputInitial: UpdatePendingUpdateParamsInput = {
        id,
        catalogId,
        resourceTypeId,
        pendingUpdateParams: initialParams,
      };
      await updatePendingUpdateParamsImpl(logger)(inputInitial, tableName, config);

      // Then update to new params
      const updatedParams = {
        approvalRequestId: "116e3c0e-04d3-0842-cbd3-d487460df082",
        updateParams: { param1: "updated", param2: "new" },
        requestUserId: "456fd3cf-8c74-7f56-ca72-6ca12e8437bd",
        requestedAt: "2023-12-01T12:00:00Z",
      };

      const inputUpdated: UpdatePendingUpdateParamsInput = {
        id,
        catalogId,
        resourceTypeId,
        pendingUpdateParams: updatedParams,
      };

      const resultAsync = updatePendingUpdateParamsImpl(logger)(inputUpdated, tableName, config);
      const result = await resultAsync;

      if (result.isErr()) {
        throw result.error;
      }

      expect(result.value.pendingUpdateParams).toEqual(updatedParams);
    });
  });
});
