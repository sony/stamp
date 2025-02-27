import { describe, expect, it } from "vitest";

import { SchedulerContext } from "../index";
import { createSchedulerEvent } from "./createSchedulerEvent";
import { deleteSchedulerEvent } from "./deleteSchedulerEvent";
import { getSchedulerEvent } from "./getSchedulerEvent";
import { updateSchedulerEvent } from "./updateSchedulerEvent";

const schedulerGroupName = process.env!.SCHEDULER_GROUP_NAME!;
const targetSNSTopicArn = process.env!.SCHEDULER_SNS_TOPIC_ARN!;
const roleArn = process.env!.SCHEDULER_ROLE_ARN!;

const schedulerContext: SchedulerContext = {
  region: "us-west-2",
  logLevel: "DEBUG",
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

  it("Should success delete operation", async () => {
    const deleteResult = await deleteSchedulerEvent(schedulerContext)({ id: createdEventId });
    expect(deleteResult.isOk()).toBeTruthy();
  });

  it("Should failed delete operation if schedule not exists", async () => {
    const deleteResult = await deleteSchedulerEvent(schedulerContext)({ id: createdEventId });
    expect(deleteResult.isErr()).toBeTruthy();
  });
});
