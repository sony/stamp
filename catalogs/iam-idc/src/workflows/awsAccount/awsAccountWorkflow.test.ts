import { expect, it, describe } from "vitest";
import { registerAwsAccount } from "./registerAwsAccount";
import { unregisterAwsAccount } from "./unregisterAwsAccount";
import { getAwsAccountInfo } from "./getAwsAccountInfo";
import { updateAwsAccountInfo } from "./updateAwsAccountInfo";
import { listAwsAccountInfo } from "./listAwsAccountInfo";
import { AwsAccount } from "../../types/awsAccount";
import { createLogger } from "@stamp-lib/stamp-logger";
import { some } from "@stamp-lib/stamp-option";

describe(
  "Testing the workflow",
  () => {
    const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
    const region = "us-west-2";
    const identityInstanceArn = process.env.IDENTITY_INSTANCE_ARN!;
    const config = {
      region: region,
      identityInstanceArn: identityInstanceArn,
      accountManagementTableName: `${process.env.IAM_IDC_DYNAMO_TABLE_PREFIX}-iam-idc-AwsAccountManagement`,
    };
    const targetAwsAccountId: string = process.env.TARGET_AWS_ACCOUNT_ID!;

    it("normal case of registerAwsAccount", async () => {
      const input = {
        accountId: targetAwsAccountId,
        name: "target AWS Account",
      };
      const expected: AwsAccount = {
        accountId: targetAwsAccountId,
        name: "target AWS Account",
      };
      const resultAsync = registerAwsAccount(logger, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const awsAccount = result.value;
      expect(awsAccount).toEqual(expected);
    });

    it("normal case of getAwsAccountInfo", async () => {
      const input = {
        accountId: targetAwsAccountId,
      };
      const expected: AwsAccount = {
        accountId: targetAwsAccountId,
        name: "target AWS Account",
      };
      const resultAsync = getAwsAccountInfo(logger, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const awsAccount = result.value;
      expect(awsAccount).toEqual(some(expected));
    });

    it("normal case of updateAwsAccountInfo", async () => {
      const input = {
        accountId: targetAwsAccountId,
        name: "Update target AWS Account",
      };
      const expected: AwsAccount = {
        accountId: targetAwsAccountId,
        name: "Update target AWS Account",
      };
      const resultAsync = updateAwsAccountInfo(logger, config)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const awsAccount = result.value;
      expect(awsAccount).toEqual(expected);
    });

    it("normal case of listAwsAccountInfo", async () => {
      const resultAsync = listAwsAccountInfo(logger, config)();
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      const listAwsAccount = result.value;
      expect(listAwsAccount.length).not.toBe(0);
    });

    it("normal case of unregisterAwsAccount", async () => {
      const input = {
        accountId: targetAwsAccountId,
      };
      const expected: AwsAccount = {
        accountId: targetAwsAccountId,
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
  },
  { timeout: 100000 }
);
