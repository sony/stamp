import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { ValidateAwsAccountInputWithName, AwsAccount } from "../../types/awsAccount";
import { getAwsAccountInfo } from "./getAwsAccountInfo";
import { registerAwsAccount } from "./registerAwsAccount";
import { unregisterAwsAccount } from "./unregisterAwsAccount";
import { createLogger } from "@stamp-lib/stamp-logger";
import { some, none } from "@stamp-lib/stamp-option";

describe("getAwsAccountInfo", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const region = "us-west-2";
  const config = {
    region: region,
    accountManagementTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-AwsAccountManagement`,
  };
  beforeAll(async () => {
    const input: ValidateAwsAccountInputWithName = {
      accountId: "123456789012",
      name: "stamp-unit-test",
    };
    const resultAsync = registerAwsAccount(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
  });

  it("should return the correct AwsAccount when getAwsAccountInfo is called with valid inputSuccessful case in getAwsAccountInfo", async () => {
    const expected: AwsAccount = {
      accountId: "123456789012",
      name: "stamp-unit-test",
    };
    const resultAsync = getAwsAccountInfo(
      logger,
      config
    )({
      accountId: "123456789012",
    });
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const awsAccount = result.value;
    expect(awsAccount).toEqual(some(expected));
  });

  it("should return an error when getAwsAccountInfo is called with an accountId that does not exist", async () => {
    const resultAsync = getAwsAccountInfo(
      logger,
      config
    )({
      accountId: "123456789000",
    });
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toEqual(none);
  });

  afterAll(async () => {
    const input: ValidateAwsAccountInputWithName = {
      accountId: "123456789012",
      name: "stamp-unit-test",
    };
    const resultAsync = unregisterAwsAccount(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
  });
});
