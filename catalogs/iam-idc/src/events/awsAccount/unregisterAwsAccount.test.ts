import { expect, it, describe, beforeAll } from "vitest";
import { ValidateAwsAccountInputWithName, ValidatedAwsAccountInput, AwsAccount } from "../../types/awsAccount";
import { registerAwsAccount } from "./registerAwsAccount";
import { unregisterAwsAccount } from "./unregisterAwsAccount";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("unregisterAwsAccount", () => {
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

  it("Successful case in unregisterAwsAccount", async () => {
    const input: ValidatedAwsAccountInput = {
      accountId: "123456789012",
    };
    const expected: AwsAccount = {
      accountId: "123456789012",
      name: "",
    };
    const resultAsync = unregisterAwsAccount(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const awsAccount = result.value;
    expect(awsAccount).toEqual(expected);
  });
});
