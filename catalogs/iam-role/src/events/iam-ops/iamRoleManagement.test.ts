import { expect, it, describe, beforeEach, vi, afterAll, beforeAll } from "vitest";
import { IAMClient } from "@aws-sdk/client-iam";
import { promoteIamRole, demoteIamRole, listIamRoleAttachedPolicyArns, fetchAllAttachedRolePolicyArns } from "./iamRoleManagement";
import { createLogger } from "@stamp-lib/stamp-logger";

const accountId = process.env.AWS_ACCOUNT_ID!;
const iamRoleFactoryAccountId = process.env.IAM_ROLE_FACTORY_AWS_ACCOUNT_ID!;

const testInput = {
  sourceRoleName: "stamp-iam-role-unit-test", // IAM role created in advance for this test
  assumeRolePolicyArn: `arn:aws:iam::${accountId}:policy/StampAssumeRolePolicy-${iamRoleFactoryAccountId}-stamp-iam-role-unit-test`,
};

describe("IAM role Management", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-role" });
  beforeEach(() => {
    vi.resetModules();
  });
  beforeAll(async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const demoteResult = await demoteIamRole(logger, iamClient)(testInput);
    if (demoteResult.isErr()) {
      throw demoteResult.error;
    }
  });

  afterAll(async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const demoteResult = await demoteIamRole(logger, iamClient)(testInput);
    if (demoteResult.isErr()) {
      throw demoteResult.error;
    }
  });

  it("should promote and demote", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const promoteResult = await promoteIamRole(logger, iamClient)(testInput);
    expect(promoteResult.isOk()).toBe(true);
    const demoteResult = await demoteIamRole(logger, iamClient)(testInput);
    expect(demoteResult.isOk()).toBe(true);
  });

  it("should return ok result even if promote execute twice.", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const promoteResultOne = await promoteIamRole(logger, iamClient)(testInput);
    expect(promoteResultOne.isOk()).toBe(true);
    const promoteResultTwo = await promoteIamRole(logger, iamClient)(testInput);
    expect(promoteResultTwo.isOk()).toBe(true);
    const demoteResult = await demoteIamRole(logger, iamClient)(testInput);
    expect(demoteResult.isOk()).toBe(true);
  });

  it("demote event should return ok even if not promoted role .", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const demoteResult = await demoteIamRole(logger, iamClient)(testInput);
    expect(demoteResult.isOk()).toBe(true);
  });

  it("promote event should return error result if sourceRoleName is not exist.", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const promoteResult = await promoteIamRole(
      logger,
      iamClient
    )({
      sourceRoleName: "this-is-not-exist",
      assumeRolePolicyArn: `arn:aws:iam::${accountId}:policy/this-is-not-exist`,
    });
    expect(promoteResult.isOk()).toBe(false);
  });

  it("demote event should return error result if sourceRoleName is not exist.", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const promoteResult = await demoteIamRole(
      logger,
      iamClient
    )({
      sourceRoleName: "this-is-not-exist",
      assumeRolePolicyArn: `arn:aws:iam::${accountId}:policy/this-is-not-exist`,
    });
    expect(promoteResult.isOk()).toBe(false);
  });

  it("listIamRoleAttachedPolicyArns should return empty array if not attached policy.", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const input = {
      iamRoleName: "stamp-iam-role-unit-test",
    };
    const result = await listIamRoleAttachedPolicyArns(logger, iamClient)(input);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.attachedPolicyArns.length).toBe(0);
  });

  it("returns nextToken is undefined when there are no more lists to get", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const input = {
      iamRoleName: "stamp-iam-role-unit-test",
      nextToken: undefined,
    };
    const result = await listIamRoleAttachedPolicyArns(logger, iamClient)(input);
    if (result.isErr()) {
      throw result.error;
    }
    expect(Array.isArray(result.value.attachedPolicyArns)).toBe(true);
    expect(result.value.nextToken).toBe(undefined);
  });

  it("returns nextToken is undefined when there are less than 10 items to list", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const input = {
      iamRoleName: "stamp-iam-role-unit-test",
      maxItems: 10,
    };
    const result = await listIamRoleAttachedPolicyArns(logger, iamClient)(input);
    if (result.isErr()) {
      throw result.error;
    }
    expect(Array.isArray(result.value.attachedPolicyArns)).toBe(true);
    expect(result.value.nextToken).toBe(undefined);
  });

  it("fetchAllAttachedRolePolicyArns should return empty array if not attached policy.", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const listAttachedRolePoliciesFunc = listIamRoleAttachedPolicyArns(logger, iamClient);
    const iamRoleName = "stamp-iam-role-unit-test";
    const result = await fetchAllAttachedRolePolicyArns(listAttachedRolePoliciesFunc)({ iamRoleName });
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.attachedPolicyArns.length).toBe(0);
  });

  it("should fetch all attached role policy ARNs correctly", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const promoteResult = await promoteIamRole(logger, iamClient)(testInput);
    expect(promoteResult.isOk()).toBe(true);

    const listAttachedRolePoliciesFunc = listIamRoleAttachedPolicyArns(logger, iamClient);
    const iamRoleName = "stamp-iam-role-unit-test";
    const result = await fetchAllAttachedRolePolicyArns(listAttachedRolePoliciesFunc)({ iamRoleName });
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.attachedPolicyArns).toBeInstanceOf(Array);
    expect(result.value.attachedPolicyArns.length).toBe(1);

    const demoteResult = await demoteIamRole(logger, iamClient)(testInput);
    expect(demoteResult.isOk()).toBe(true);

    const result2 = await fetchAllAttachedRolePolicyArns(listAttachedRolePoliciesFunc)({ iamRoleName });
    if (result2.isErr()) {
      throw result2.error;
    }
    expect(result2.value.attachedPolicyArns).toBeInstanceOf(Array);
    expect(result2.value.attachedPolicyArns.length).toBe(0);
  });
});
