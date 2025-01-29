import { createLogger } from "@stamp-lib/stamp-logger";
import { beforeAll, describe, expect, it } from "vitest";

import { SchedulerContext } from "../index";
import { createSchedule } from "./create";
import { deleteSchedule } from "./delete";
import { getSchedule } from "./get";

const logger = createLogger("DEBUG", { moduleName: "eventbridge-scheduler" });
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

describe("Test schedule, get, delete operation", () => {
  beforeAll(async () => {
    await deleteSchedule(schedulerContext, logger)({ name: "test" });
  });
  it("Should success schedule operation", async () => {
    const scheduleResult = await createSchedule(
      schedulerContext,
      logger
    )({
      name: "test",
      input: JSON.stringify({ test: "test" }),
      scheduleExpression: "cron(0 12 * * ? *)",
    });
    expect(scheduleResult.isOk()).toBeTruthy();
  });

  it("Should failed schedule operation if same name schedule already exists", async () => {
    const scheduleResult = await createSchedule(
      schedulerContext,
      logger
    )({
      name: "test",
      input: JSON.stringify({ test: "test" }),
      scheduleExpression: "cron(0 12 * * ? *)",
    });
    expect(scheduleResult.isErr()).toBeTruthy();
  });

  it("Should success getSchedule operation", async () => {
    const getScheduleResult = await getSchedule(schedulerContext, logger)({ name: "test" });
    expect(getScheduleResult.isOk()).toBeTruthy();
  });

  it("Should success deleteSchedule operation", async () => {
    const deleteScheduleResult = await deleteSchedule(schedulerContext, logger)({ name: "test" });
    expect(deleteScheduleResult.isOk()).toBeTruthy();
  });

  it("Should failed deleteSchedule operation if schedule not exists", async () => {
    const deleteScheduleResult = await deleteSchedule(schedulerContext, logger)({ name: "test" });
    expect(deleteScheduleResult.isErr()).toBeTruthy();
  });

  it("getSchedule should return none after deleteSchedule", async () => {
    const getScheduleResult = await getSchedule(schedulerContext, logger)({ name: "test" });
    expect(getScheduleResult._unsafeUnwrap().isNone()).toBeTruthy();
  });
});

describe("Test invalid param", () => {
  it("Should failed schedule operation if invalid schedule expression", async () => {
    const scheduleResult = await createSchedule(
      schedulerContext,
      logger
    )({
      name: "test",
      input: JSON.stringify({ test: "test" }),
      scheduleExpression: "invalid",
    });
    expect(scheduleResult.isErr()).toBeTruthy();
  });
});
