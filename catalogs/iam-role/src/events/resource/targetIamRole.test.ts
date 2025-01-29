import { IAMClient } from "@aws-sdk/client-iam";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CreateTargetIamRoleCommand, CreatedTargetIamRole, TargetIamRole } from "../../types/targetIamRole";
import { createAssumeRolePolicy, deleteAssumeRolePolicy } from "../iam-ops/assumeRolePolicy";
import { generatePolicyName } from "../iam-ops/policyName";
import { createTargetIamRole, deleteTargetIamRole } from "./targetIamRole";
import { createLogger, Logger } from "@stamp-lib/stamp-logger";

const prefixName = "stamp";
const accountId = process.env.AWS_ACCOUNT_ID!;
const iamRoleName = "stamp-test-iam-role";
const id = `${accountId}#${iamRoleName}`;
const createdAt = "2024-01-02T03:04:05.006Z";
const policyName = generatePolicyName(prefixName, accountId, iamRoleName);
const assumeRolePolicyArn = `arn:aws:iam::${accountId}:policy/${policyName}`;

const deleteTargetIamRoleForTest = async (logger: Logger) => {
  const iamClient: IAMClient = new IAMClient({ region: "us-west-2" });
  const input: TargetIamRole = {
    accountId: accountId,
    iamRoleName: iamRoleName,
    id: id,
    createdAt: createdAt,
    assumeRolePolicyArn: assumeRolePolicyArn,
  };
  await deleteTargetIamRole(deleteAssumeRolePolicy(logger, iamClient))(input);
};

describe("Testing targetIamRole", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-role" });
  beforeAll(async () => {
    await deleteTargetIamRoleForTest(logger);
  });
  afterAll(async () => {
    await deleteTargetIamRoleForTest(logger);
  });

  describe("createTargetIamRole", () => {
    it("creates target iam role", async () => {
      const iamClient: IAMClient = new IAMClient({ region: "us-west-2" });
      const input: CreateTargetIamRoleCommand = {
        accountId: accountId,
        iamRoleName: iamRoleName,
        prefixName: prefixName,
      };
      const expected: CreatedTargetIamRole = {
        accountId: accountId,
        iamRoleName: iamRoleName,
        id: id,
        createdAt: expect.any(String),
        assumeRolePolicyArn: assumeRolePolicyArn,
      };
      const resultAsync = createTargetIamRole(createAssumeRolePolicy(logger, iamClient))(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failed result if account ID is empty", async () => {
      const iamClient: IAMClient = new IAMClient({ region: "us-west-2" });
      const input: CreateTargetIamRoleCommand = {
        accountId: "",
        iamRoleName: iamRoleName,
        prefixName: prefixName,
      };
      const resultAsync = createTargetIamRole(createAssumeRolePolicy(logger, iamClient))(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if iam role name is empty", async () => {
      const iamClient: IAMClient = new IAMClient({ region: "us-west-2" });
      const input: CreateTargetIamRoleCommand = {
        accountId: accountId,
        iamRoleName: "",
        prefixName: prefixName,
      };
      const resultAsync = createTargetIamRole(createAssumeRolePolicy(logger, iamClient))(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteTargetIamRole", () => {
    it("deletes target iam role", async () => {
      const iamClient: IAMClient = new IAMClient({ region: "us-west-2" });
      const input: TargetIamRole = {
        accountId: accountId,
        iamRoleName: iamRoleName,
        id: id,
        createdAt: createdAt,
        assumeRolePolicyArn: assumeRolePolicyArn,
      };
      const expected = structuredClone(input);
      const resultAsync = deleteTargetIamRole(deleteAssumeRolePolicy(logger, iamClient))(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failed result if account ID is invalid", async () => {
      const iamClient: IAMClient = new IAMClient({ region: "us-west-2" });
      const input: TargetIamRole = {
        accountId: "",
        iamRoleName: iamRoleName,
        id: id,
        createdAt: createdAt,
        assumeRolePolicyArn: assumeRolePolicyArn,
      };
      const resultAsync = deleteTargetIamRole(deleteAssumeRolePolicy(logger, iamClient))(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if iam role name is invalid", async () => {
      const iamClient: IAMClient = new IAMClient({ region: "us-west-2" });
      const input: TargetIamRole = {
        accountId: accountId,
        iamRoleName: "",
        id: id,
        createdAt: createdAt,
        assumeRolePolicyArn: assumeRolePolicyArn,
      };
      const resultAsync = deleteTargetIamRole(deleteAssumeRolePolicy(logger, iamClient))(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if ID is invalid", async () => {
      const iamClient: IAMClient = new IAMClient({ region: "us-west-2" });
      const input: TargetIamRole = {
        accountId: accountId,
        iamRoleName: iamRoleName,
        id: "",
        createdAt: createdAt,
        assumeRolePolicyArn: assumeRolePolicyArn,
      };
      const resultAsync = deleteTargetIamRole(deleteAssumeRolePolicy(logger, iamClient))(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if created date is invalid", async () => {
      const iamClient: IAMClient = new IAMClient({ region: "us-west-2" });
      const input: TargetIamRole = {
        accountId: accountId,
        iamRoleName: iamRoleName,
        id: id,
        createdAt: "",
        assumeRolePolicyArn: assumeRolePolicyArn,
      };
      const resultAsync = deleteTargetIamRole(deleteAssumeRolePolicy(logger, iamClient))(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if assume role policy arn is invalid", async () => {
      const iamClient: IAMClient = new IAMClient({ region: "us-west-2" });
      const input: TargetIamRole = {
        accountId: accountId,
        iamRoleName: iamRoleName,
        id: id,
        createdAt: createdAt,
        assumeRolePolicyArn: "",
      };
      const resultAsync = deleteTargetIamRole(deleteAssumeRolePolicy(logger, iamClient))(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
