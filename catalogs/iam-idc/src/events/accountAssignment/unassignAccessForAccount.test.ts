import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { createPermissionSet } from "../permissionSet/createPermissionSet";
import { attachCustomerManagedPolicy } from "../attachedManagedPolicy/attachCustomerManagedPolicy";
import { createGroup } from "../group/createGroup";
import { provisionPermissionSet } from "../permissionSet/provisionPermissionSet";
import { assignAccessForAccount } from "./assignAccessForAccount";
import { unassignAccessForAccount } from "./unassignAccessForAccount";
import { deletePermissionSet } from "../permissionSet/createPermissionSet.test";
import { deleteGroup } from "../group/createGroup.test";
import { createLogger } from "@stamp-lib/stamp-logger";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

describe("UnassignAccessForAccount", () => {
  let createdPermissionSetArn: string | null = null;
  let groupId: string | null = null;
  const logger = createLogger("DEBUG", { moduleName: "iam-idc" });
  const region = "us-west-2";
  const identityInstanceArn = process.env.IDENTITY_INSTANCE_ARN!;
  const identityStoreId = process.env.IDENTITY_STORE_ID!;
  const targetAwsAccountId = process.env.TARGET_AWS_ACCOUNT_ID!;

  const config = {
    region: region,
    identityInstanceArn: identityInstanceArn,
    identityStoreId: identityStoreId,
  };
  beforeAll(async () => {
    const input = {
      sessionDuration: "PT12H",
      managedIamPolicyNames: ["ReadOnlyAccess"],
      customIamPolicyNames: [`Stamp-Unit-test-${targetAwsAccountId}`], // Custom policy created in target AWS Account
      awsAccountId: targetAwsAccountId,
      permissionId: `Stamp-Unit-test-${targetAwsAccountId}`,
    };
    const resultAsync = createPermissionSet(logger, config)(input)
      .andThen(attachCustomerManagedPolicy(logger, config))
      .andThen(createGroup(logger, config))
      .andThen(provisionPermissionSet(logger, config))
      .andThen(assignAccessForAccount(logger, config));
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const createdPermissionSet = result.value;
    createdPermissionSetArn = createdPermissionSet.permissionSetArn;
    groupId = createdPermissionSet.groupId;

    // Wait for 5 seconds to avoid ConflictException
    console.log("wait 5 second");
    await sleep(5000);
  });

  it("Successful case in UnassignAccessForAccount", async () => {
    if (createdPermissionSetArn === null || groupId === null) throw new Error("createdPermissionSetArn or groupId is undefined.");
    const input = {
      permissionSetName: "Unit-test",
      awsAccountId: targetAwsAccountId,
      permissionSetArn: createdPermissionSetArn,
      groupId: groupId,
    };
    const expected = structuredClone(input);
    const resultAsync = unassignAccessForAccount(logger, config)(input);
    const result = await resultAsync;
    if (result.isErr()) {
      throw result.error;
    }
    const validatedPermissionSet = result.value;
    expect(validatedPermissionSet).toEqual(expected);
  });

  it("Case for already unassigned resources", async () => {
    if (createdPermissionSetArn === null || groupId === null) throw new Error("createdPermissionSetArn or groupId is undefined.");
    const input = {
      permissionSetName: "Unit-test",
      awsAccountId: targetAwsAccountId,
      permissionSetArn: createdPermissionSetArn,
      groupId: groupId,
    };
    const resultAsync = unassignAccessForAccount(logger, config)(input);
    const result = await resultAsync;
    expect(result.isErr()).toBe(false);
  }, 10000);

  afterAll(async () => {
    // Delete the created Group if it exists
    if (identityStoreId && groupId) {
      await deleteGroup(identityStoreId, groupId);
      groupId = null;
    }

    // Delete the created PermissionSet if it exists
    if (createdPermissionSetArn) {
      await deletePermissionSet(identityInstanceArn, createdPermissionSetArn);
      createdPermissionSetArn = null;
    }
  });
});
