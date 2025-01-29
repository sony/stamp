import { DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { createLogger } from "@stamp-lib/stamp-logger";
import { SchedulerEvent } from "@stamp-lib/stamp-types/models";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createItem, deleteItem, getById, listAll, listByEventType, updateItem } from "./schedulerEvent";

const tableName = `${process.env!.TABLE_NAME_PREFIX!}-eventbridge-scheduler-SchedulerEvent`;
const logger = createLogger("DEBUG", { moduleName: "eventbridge-scheduler" });
const config: DynamoDBClientConfig = { region: "us-west-2" };

describe("Test for create, update, get, and delete operations", () => {
  const testSchedulerEvent: SchedulerEvent = {
    id: "test",
    eventType: "testEvent",
    property: { test: "test" },
    schedulePattern: {
      type: "cron",
      expression: "cron(0 12 * * ? *)",
    },
  };
  const testUpdateSchedulerEvent: SchedulerEvent = {
    id: "test",
    eventType: "testUpdateEvent",
    property: { test: "testUpdate" },
    schedulePattern: {
      type: "cron",
      expression: "cron(12 12 * * ? *)",
    },
  };

  it("Should success createItem", async () => {
    const createItemResult = await createItem({ logger, TableName: tableName, config })(testSchedulerEvent);
    if (createItemResult.isErr()) {
      throw createItemResult.error;
    }
    expect(createItemResult.value).toStrictEqual(testSchedulerEvent);
  });

  it("Should success updateItem", async () => {
    const createItemResult = await updateItem({ logger, TableName: tableName, config })(testUpdateSchedulerEvent);
    if (createItemResult.isErr()) {
      throw createItemResult.error;
    }
    expect(createItemResult.value).toStrictEqual(testUpdateSchedulerEvent);
  });

  it("Should success getById", async () => {
    const getByIdResult = await getById({ logger, TableName: tableName, config })(testSchedulerEvent.id);
    if (getByIdResult.isErr()) {
      throw getByIdResult.error;
    }
    expect.assertions(1);
    if (getByIdResult.value.isSome()) {
      expect(getByIdResult.value.value).toStrictEqual(testUpdateSchedulerEvent);
    }
  });

  it("Should success deleteItem", async () => {
    const deleteItemResult = await deleteItem({ logger, TableName: tableName, config })(testSchedulerEvent.id);
    expect(deleteItemResult.isOk()).toBeTruthy();
  });

  it("Should getById return none after deleteItem", async () => {
    const getByIdResult = await getById({ logger, TableName: tableName, config })(testSchedulerEvent.id);
    if (getByIdResult.isErr()) {
      throw getByIdResult.error;
    }
    expect(getByIdResult.value.isNone()).toBeTruthy();
  });
});

describe("Test list operation", () => {
  beforeAll(async () => {
    await createItem({ logger, TableName: tableName, config })({
      id: "test-1",
      eventType: "testEvent",
      property: { test: "test" },
      schedulePattern: {
        type: "cron",
        expression: "0 12 * * ? *",
      },
    });
    await createItem({ logger, TableName: tableName, config })({
      id: "test-2",
      eventType: "testEvent",
      property: { test: "test" },
      schedulePattern: {
        type: "cron",
        expression: "0 12 * * ? *",
      },
    });
    await createItem({ logger, TableName: tableName, config })({
      id: "test-3",
      eventType: "testEvent",
      property: { test: "test" },
      schedulePattern: {
        type: "cron",
        expression: "0 12 * * ? *",
      },
    });
    // update the third schedule's eventType to anotherEvent
    await updateItem({ logger, TableName: tableName, config })({
      id: "test-3",
      eventType: "anotherEvent",
      property: { test: "test" },
      schedulePattern: {
        type: "cron",
        expression: "0 12 * * ? *",
      },
    });
  });

  afterAll(async () => {
    await deleteItem({ logger, TableName: tableName, config })("test-1");
    await deleteItem({ logger, TableName: tableName, config })("test-2");
    await deleteItem({ logger, TableName: tableName, config })("test-3");
  });

  it("Should success listAll", async () => {
    const listAllResult = await listAll({ logger, TableName: tableName, config })({});
    expect(listAllResult.isOk()).toBeTruthy();
  });

  it("Should work paginationToken at listAll", async () => {
    const listAllResult = await listAll({ logger, TableName: tableName, config })({ limit: 1 });
    if (listAllResult.isErr()) {
      throw listAllResult.error;
    }
    expect(listAllResult.value.nextPaginationToken).toString();

    const listAllResult2 = await listAll({ logger, TableName: tableName, config })({ limit: 2, paginationToken: listAllResult.value.nextPaginationToken });
    if (listAllResult2.isErr()) {
      throw listAllResult2.error;
    }
    expect(listAllResult2.value.items.length).toBe(2);
  });

  it("Should success listByEventType", async () => {
    const listByEventTypeResult = await listByEventType({ logger, TableName: tableName, config })({ eventType: "testEvent" });
    if (listByEventTypeResult.isErr()) {
      throw listByEventTypeResult.error;
    }
    expect(listByEventTypeResult.value.items[0].eventType).toBe("testEvent");
    expect(listByEventTypeResult.value.items[1].eventType).toBe("testEvent");

    const listByEventTypeResult2 = await listByEventType({ logger, TableName: tableName, config })({ eventType: "anotherEvent" });
    if (listByEventTypeResult2.isErr()) {
      throw listByEventTypeResult2.error;
    }
    expect(listByEventTypeResult2.value.items[0].eventType).toBe("anotherEvent");
  });

  it("Should work paginationToken at listByEventType", async () => {
    const listByEventTypeResult = await listByEventType({ logger, TableName: tableName, config })({ eventType: "testEvent", limit: 1 });
    if (listByEventTypeResult.isErr()) {
      throw listByEventTypeResult.error;
    }
    expect(listByEventTypeResult.value.nextPaginationToken).toString();

    const listByEventTypeResult2 = await listByEventType({ logger, TableName: tableName, config })({
      limit: 1,
      eventType: "testEvent",
      paginationToken: listByEventTypeResult.value.nextPaginationToken,
    });
    if (listByEventTypeResult2.isErr()) {
      throw listByEventTypeResult2.error;
    }
    expect(listByEventTypeResult2.value.items.length).toBe(1); // Check if only 1 testEvent
  });
});
