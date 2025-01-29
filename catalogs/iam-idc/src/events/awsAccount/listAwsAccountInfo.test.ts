import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { ValidateAwsAccountInputWithName, AwsAccount } from "../../types/awsAccount";
import { listAwsAccountInfo } from "./listAwsAccountInfo";
import { registerAwsAccount } from "./registerAwsAccount";
import { unregisterAwsAccount } from "./unregisterAwsAccount";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("listAwsAccountInfo", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const region = "us-west-2";
  const config = {
    region: region,
    accountManagementTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-AwsAccountManagement`,
  };
  beforeAll(async () => {
    const input1: ValidateAwsAccountInputWithName = {
      accountId: "111111111111",
      name: "stamp-unit-test-1",
    };
    const result1 = await registerAwsAccount(logger, config)(input1);
    if (result1.isErr()) {
      throw result1.error;
    }
    const input2: ValidateAwsAccountInputWithName = {
      accountId: "222222222222",
      name: "stamp-unit-test-2",
    };
    const result2 = await registerAwsAccount(logger, config)(input2);
    if (result2.isErr()) {
      throw result2.error;
    }
  });

  it("should return all AWS Accounts", async () => {
    const expected: AwsAccount[] = [
      {
        accountId: "111111111111",
        name: "stamp-unit-test-1",
      },
      {
        accountId: "222222222222",
        name: "stamp-unit-test-2",
      },
    ];
    const resultAsync = listAwsAccountInfo(logger, config)();
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const listAwsAccount = result.value;
    expect(listAwsAccount).toEqual(expected);
  });

  afterAll(async () => {
    const input1: ValidateAwsAccountInputWithName = {
      accountId: "111111111111",
      name: "stamp-unit-test-1",
    };
    const result1 = await unregisterAwsAccount(logger, config)(input1);
    if (result1.isErr()) {
      throw result1.error;
    }
    const input2: ValidateAwsAccountInputWithName = {
      accountId: "222222222222",
      name: "stamp-unit-test-2",
    };
    const result2 = await unregisterAwsAccount(logger, config)(input2);
    if (result2.isErr()) {
      throw result2.error;
    }
  });
});
