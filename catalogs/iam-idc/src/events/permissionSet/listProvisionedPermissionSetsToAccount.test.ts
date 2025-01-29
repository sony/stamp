import { expect, it, describe } from "vitest";
import { listProvisionedPermissionSetsToAccount, ListProvisionedPermissionSetsToAccountInput } from "./listProvisionedPermissionSetsToAccount";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("listProvisionedPermissionSetsToAccount", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const region = "us-west-2";
  const identityInstanceArn = process.env.IDENTITY_INSTANCE_ARN!;
  const targetAwsAccountId = process.env.TARGET_AWS_ACCOUNT_ID!;

  const config = {
    region: region,
    identityInstanceArn: identityInstanceArn,
  };
  it("Successful case in listProvisionedPermissionSetsToAccount", async () => {
    const input: ListProvisionedPermissionSetsToAccountInput = {
      accountId: targetAwsAccountId,
    };
    const resultAsync = listProvisionedPermissionSetsToAccount(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const listPermissionSet = result.value;
    expect(listPermissionSet.permissionSets.length).not.toBe(0);
  });
});
