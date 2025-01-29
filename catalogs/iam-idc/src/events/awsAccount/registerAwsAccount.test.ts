import { expect, it, describe, afterAll } from "vitest";
import { AwsAccount } from "../../types/awsAccount";
import { registerAwsAccount } from "./registerAwsAccount";
import { unregisterAwsAccount } from "./unregisterAwsAccount";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("registerAwsAccount", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const region = "us-west-2";
  const config = {
    region: region,
    accountManagementTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-AwsAccountManagement`,
  };
  it("should return a ResultAsync", async () => {
    const input = {
      accountId: "123456789012",
      name: "stamp-unit-test",
    };
    const expected: AwsAccount = {
      accountId: "123456789012",
      name: "stamp-unit-test",
    };
    const resultAsync = registerAwsAccount(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const awsAccount = result.value;
    expect(awsAccount).toEqual(expected);
  });

  afterAll(async () => {
    const input = {
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
