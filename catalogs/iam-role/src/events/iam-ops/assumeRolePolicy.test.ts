import { IAMClient } from "@aws-sdk/client-iam";
import { createLogger } from "@stamp-lib/stamp-logger";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateAssumeRolePolicyCommand, createAssumeRolePolicy, deleteAssumeRolePolicy, listIamRoleAttachedAssumeRolePolicy } from "./assumeRolePolicy";
import { generatePolicyName } from "./policyName";
const targetAWSAccountId = process.env.AWS_ACCOUNT_ID!;
const testInput = {
  prefixPolicyName: "stamp",
  targetRoleName: "test-iam-role", //  non-existing IAM role name for temporary testing.
  targetAWSAccountId: targetAWSAccountId,
};

describe("AssumeRolePolicy", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-role" });
  beforeEach(() => {
    vi.resetModules();
  });
  beforeAll(async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const assumeRoleName = generatePolicyName(testInput.prefixPolicyName, testInput.targetAWSAccountId, testInput.targetRoleName);
    await deleteAssumeRolePolicy(
      logger,
      iamClient
    )({
      assumeRolePolicyArn: `arn:aws:iam::${testInput.targetAWSAccountId}:policy/${assumeRoleName}`,
    });
  });

  afterAll(async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const assumeRoleName = generatePolicyName(testInput.prefixPolicyName, testInput.targetAWSAccountId, testInput.targetRoleName);
    await deleteAssumeRolePolicy(
      logger,
      iamClient
    )({
      assumeRolePolicyArn: `arn:aws:iam::${testInput.targetAWSAccountId}:policy/${assumeRoleName}`,
    });
  });

  it("should create and delete assume role policy", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const createAssumeRoleResult = await createAssumeRolePolicy(logger, iamClient)(testInput);
    if (createAssumeRoleResult.isErr()) {
      throw createAssumeRoleResult.error;
    }
    const deleteAssumeRoleResult = await deleteAssumeRolePolicy(logger, iamClient)({ assumeRolePolicyArn: createAssumeRoleResult.value.assumeRolePolicyArn });
    expect(deleteAssumeRoleResult.isOk()).toBe(true);
  });

  it("should return error result if createAssumeRolePolicy execute twice.", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const createAssumeRoleResultOne = await createAssumeRolePolicy(logger, iamClient)(testInput);
    if (createAssumeRoleResultOne.isErr()) {
      throw createAssumeRoleResultOne.error;
    }
    const createAssumeRoleResultTwo = await createAssumeRolePolicy(logger, iamClient)(testInput);
    expect(createAssumeRoleResultTwo.isOk()).toBe(false);

    const deleteAssumeRoleResult = await deleteAssumeRolePolicy(
      logger,
      iamClient
    )({ assumeRolePolicyArn: createAssumeRoleResultOne.value.assumeRolePolicyArn });
    expect(deleteAssumeRoleResult.isOk()).toBe(true);
  });

  it("should return error result if target role name is empty", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const input: CreateAssumeRolePolicyCommand = {
      prefixPolicyName: "stamp",
      targetRoleName: "",
      targetAWSAccountId: targetAWSAccountId,
    };
    const createAssumeRoleResult = await createAssumeRolePolicy(logger, iamClient)(input);
    expect(createAssumeRoleResult.isErr()).toBe(true);
  });

  it("should return error result if target AWS account ID is empty", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const input: CreateAssumeRolePolicyCommand = {
      prefixPolicyName: "stamp",
      targetRoleName: "test-iam-role",
      targetAWSAccountId: "",
    };
    const createAssumeRoleResult = await createAssumeRolePolicy(logger, iamClient)(input);
    expect(createAssumeRoleResult.isErr()).toBe(true);
  });

  it("deleteAssumeRolePolicy event should return error if not created assume role policy.", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const deleteAssumeRoleResult = await deleteAssumeRolePolicy(
      logger,
      iamClient
    )({
      assumeRolePolicyArn: `arn:aws:iam::${testInput.targetAWSAccountId}:policy/this-is-not-exist`,
    });
    expect(deleteAssumeRoleResult.isOk()).toBe(false);
  });

  it("listIamRoleAttachedAssumeRolePolicy should return empty array if not attached assume role policy.", async () => {
    const iamClient = new IAMClient({ region: "us-west-2" });
    const assumeRoleName = generatePolicyName(testInput.prefixPolicyName, testInput.targetAWSAccountId, testInput.targetRoleName);
    const listResult = await listIamRoleAttachedAssumeRolePolicy(
      logger,
      iamClient
    )({
      assumeRolePolicyArn: `arn:aws:iam::${testInput.targetAWSAccountId}:policy/${assumeRoleName}`,
    });
    if (listResult.isErr()) {
      throw listResult.error;
    }
    expect(listResult.value.roleNames.length).toBe(0);
  });
});
