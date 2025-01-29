import { expect, it, describe } from "vitest";
import { listPermissionSets } from "./listPermissionSets";
import { createLogger } from "@stamp-lib/stamp-logger";

describe("listPermissionSets", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const region = "us-west-2";
  const identityInstanceArn = process.env.IDENTITY_INSTANCE_ARN!;
  const config = {
    region: region,
    identityInstanceArn: identityInstanceArn,
  };
  it("Successful case in listPermissionSets", async () => {
    const resultAsync = listPermissionSets(logger, config)();
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const listPermissionSet = result.value;
    expect(listPermissionSet.permissionSets.length).not.toBe(0);
  });
});
