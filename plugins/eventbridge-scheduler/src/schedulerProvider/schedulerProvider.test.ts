import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SchedulerContext } from "../index";
import { createSchedulerEvent } from "./createSchedulerEvent";
import { deleteSchedulerEvent } from "./deleteSchedulerEvent";
import { getSchedulerEvent } from "./getSchedulerEvent";
import { listSchedulerEvent } from "./listSchedulerEvent";
import { updateSchedulerEvent } from "./updateSchedulerEvent";

const tableName = `${process.env!.TABLE_NAME_PREFIX!}-eventbridge-scheduler-SchedulerEvent`;
const schedulerGroupName = process.env!.SCHEDULER_GROUP_NAME!;
const targetSNSTopicArn = process.env!.SCHEDULER_SNS_TOPIC_ARN!;
const roleArn = process.env!.SCHEDULER_ROLE_ARN!;

const schedulerContext: SchedulerContext = {
  region: "us-west-2",
  logLevel: "DEBUG",
  tableName,
  schedulerGroupName,
  targetSNSTopicArn,
  roleArn,
};

describe("Test for create, update, get, delete, and list operations", () => {
  let createdEventId: string;

  it("Should success create operation", async () => {
    const createResult = await createSchedulerEvent(schedulerContext)({
      eventType: "testEvent",
      property: { test: "test" },
      schedulePattern: { type: "cron", expression: "0 12 * * ? *" },
    });
    if (createResult.isErr()) {
      throw createResult.error;
    }
    expect(createResult.isOk()).toBeTruthy();
    createdEventId = createResult.value.id;
  });

  it("Should success update operation", async () => {
    const createResult = await updateSchedulerEvent(schedulerContext)({
      id: createdEventId,
      eventType: "testUpdateEvent",
      property: { test: "testUpdate" },
      schedulePattern: { type: "cron", expression: "0 13 * * ? *" },
    });
    if (createResult.isErr()) {
      throw createResult.error;
    }
    expect(createResult.isOk()).toBeTruthy();
  });

  it("Should success get operation", async () => {
    const getResult = await getSchedulerEvent(schedulerContext)({ id: createdEventId });
    expect(getResult.isOk()).toBeTruthy();
  });

  it("Should success list operation", async () => {
    const listResult = await listSchedulerEvent(schedulerContext)({});
    expect(listResult.isOk()).toBeTruthy();
  });

  it("Should success delete operation", async () => {
    const deleteResult = await deleteSchedulerEvent(schedulerContext)({ id: createdEventId });
    expect(deleteResult.isOk()).toBeTruthy();
  });

  it("Should failed delete operation if schedule not exists", async () => {
    const deleteResult = await deleteSchedulerEvent(schedulerContext)({ id: createdEventId });
    expect(deleteResult.isErr()).toBeTruthy();
  });
});

describe("Test at schedule pattern", () => {
  let createdEventId: string;

  it("Should success create operation", async () => {
    const createResult = await createSchedulerEvent(schedulerContext)({
      eventType: "testEvent",
      property: { test: "test" },
      schedulePattern: { type: "at", time: "2024-11-20T13:00:00" },
    });
    if (createResult.isErr()) {
      throw createResult.error;
    }
    expect(createResult.isOk()).toBeTruthy();
    createdEventId = createResult.value.id;
  });

  it("Should success get operation", async () => {
    const getResult = await getSchedulerEvent(schedulerContext)({ id: createdEventId });
    expect(getResult.isOk()).toBeTruthy();
  });

  it("Should success delete operation", async () => {
    const deleteResult = await deleteSchedulerEvent(schedulerContext)({ id: createdEventId });
    expect(deleteResult.isOk()).toBeTruthy();
  });
});

describe("Test list operation", () => {
  const createdEventIds: Array<string> = [];
  beforeAll(async () => {
    const createSchedulerEventResult = await createSchedulerEvent(schedulerContext)({
      eventType: "testEvent",
      property: { test: "test" },
      schedulePattern: { type: "cron", expression: "0 12 * * ? *" },
    });
    if (createSchedulerEventResult.isErr()) {
      throw createSchedulerEventResult.error;
    }
    createdEventIds.push(createSchedulerEventResult.value.id);

    const createSchedulerEventResult2 = await createSchedulerEvent(schedulerContext)({
      eventType: "testEvent",
      property: { test: "test" },
      schedulePattern: { type: "cron", expression: "0 12 * * ? *" },
    });
    if (createSchedulerEventResult2.isErr()) {
      throw createSchedulerEventResult2.error;
    }
    createdEventIds.push(createSchedulerEventResult2.value.id);

    const createSchedulerEventResult3 = await createSchedulerEvent(schedulerContext)({
      eventType: "testEvent",
      property: { test: "test" },
      schedulePattern: { type: "cron", expression: "0 12 * * ? *" },
    });
    if (createSchedulerEventResult3.isErr()) {
      throw createSchedulerEventResult3.error;
    }
    createdEventIds.push(createSchedulerEventResult3.value.id);

    // update the third schedule's eventType to anotherEvent
    const updateAnotherSchedulerEventResult = await updateSchedulerEvent(schedulerContext)({
      id: createSchedulerEventResult3.value.id,
      eventType: "anotherEvent",
      property: { test: "test" },
      schedulePattern: { type: "cron", expression: "0 12 * * ? *" },
    });
    if (updateAnotherSchedulerEventResult.isErr()) {
      throw updateAnotherSchedulerEventResult.error;
    }
  });

  afterAll(async () => {
    for (let i = 0; i < createdEventIds.length; i++) {
      await deleteSchedulerEvent(schedulerContext)({ id: createdEventIds[i] });
    }
  });

  it("Should success list operation", async () => {
    const listResult = await listSchedulerEvent(schedulerContext)({});
    expect(listResult.isOk()).toBeTruthy();
  });

  it("Should success list operation with limit", async () => {
    const listResult = await listSchedulerEvent(schedulerContext)({ limit: 1 });
    expect(listResult._unsafeUnwrap().items.length).toBe(1);
  });

  it("Should success list operation with eventType", async () => {
    const listResult = await listSchedulerEvent(schedulerContext)({ eventType: "testEvent" });
    expect(listResult._unsafeUnwrap().items[0].eventType).toBe("testEvent");
    expect(listResult._unsafeUnwrap().items[1].eventType).toBe("testEvent");
  });
  it("Should return anotherEvent", async () => {
    const listResult = await listSchedulerEvent(schedulerContext)({ eventType: "anotherEvent" });
    expect(listResult._unsafeUnwrap().items[0].eventType).toBe("anotherEvent");
  });

  it("Should success list operation with paginationToken", async () => {
    const listResult = await listSchedulerEvent(schedulerContext)({ limit: 1 });
    if (listResult.isErr()) {
      throw listResult.error;
    }
    expect(listResult.value.nextPaginationToken).toString();

    const listResult2 = await listSchedulerEvent(schedulerContext)({ limit: 2, paginationToken: listResult.value.nextPaginationToken });
    if (listResult2.isErr()) {
      throw listResult2.error;
    }
    expect(listResult2.value.items.length).toBe(2);
  });
});
