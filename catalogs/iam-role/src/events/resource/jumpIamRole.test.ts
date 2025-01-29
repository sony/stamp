import { IAMClient } from "@aws-sdk/client-iam";
import { createLogger, Logger } from "@stamp-lib/stamp-logger";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IamRoleCatalogConfig } from "../../config";
import {
  CreateJumpIamRoleCommand,
  CreateJumpIamRoleNameCommand,
  CreatedJumpIamRole,
  CreatedJumpIamRoleName,
  JumpIamRole,
  ListJumpIamRoleAuditItem,
  ListJumpIamRoleAuditItemCommand,
} from "../../types/jumpIamRole";
import { createJumpIamRoleInAws, createJumpIamRoleName, deleteJumpIamRoleInAws, listJumpIamRoleAuditItemInAws } from "./jumpIamRole";

const iamRoleFactoryAccountId = process.env.IAM_ROLE_FACTORY_AWS_ACCOUNT_ID!;
const attachedPolicyArn = process.env.JUMP_IAM_ROLE_ATTACHED_POLICY_ARN!;
const originIamRoleArn = process.env.ORIGIN_IAM_ROLE_ARN!;
const githubOrgName = process.env.GITHUB_ORG_NAME!;

const config: IamRoleCatalogConfig = {
  region: "us-west-2",
  iamRoleFactoryAccountId: iamRoleFactoryAccountId,
  iamRoleFactoryAccountRoleArn: "test-arn",
  gitHubOrgName: githubOrgName,
  policyNamePrefix: "test",
  roleNamePrefix: "test",
  awsAccountResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-AWSAccountResource`,
  targetIamRoleResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-TargetRoleResource`,
  gitHubIamRoleResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-GitHubIamRoleResource`,
  jumpIamRoleResourceTableName: `${process.env.IAM_ROLE_DYNAMO_TABLE_PREFIX}-iam-role-JumpIamRoleResource`,
  logLevel: "DEBUG",
};

const deleteJumpIamRoleForTest = async (logger: Logger) => {
  const iamClient = new IAMClient({ region: "us-west-2" });
  const input: JumpIamRole = {
    jumpIamRoleName: "jumpTestServiceRole",
    originIamRoleArn: originIamRoleArn,
    iamRoleName: `${config.roleNamePrefix}-jump-jumpTestServiceRole`,
    iamRoleArn: "test-arn",
    createdAt: "2024-01-02T03:04:05.006Z",
  };
  await deleteJumpIamRoleInAws(logger, iamClient)(input);
};

describe("Testing jumpIamRole", () => {
  const logger = createLogger("DEBUG", { moduleName: "iam-role" });
  beforeAll(async () => {
    await deleteJumpIamRoleForTest(logger);
  });

  afterAll(async () => {
    await deleteJumpIamRoleForTest(logger);
  });

  describe("createJumpIamRoleName", () => {
    it("creates Jump iam role name if iam role name is 64 character or under", async () => {
      const input: CreateJumpIamRoleNameCommand = {
        jumpIamRoleName: "1".repeat(54), // number of characters within range excluding prefix etc
        originIamRoleArn: originIamRoleArn,
      };
      const expected: CreatedJumpIamRoleName = {
        jumpIamRoleName: "1".repeat(54), // number of characters within range excluding prefix etc
        originIamRoleArn: originIamRoleArn,
        iamRoleName: `${config.roleNamePrefix}-jump-` + "1".repeat(54),
      };
      const result = createJumpIamRoleName(config)(input);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failed result if iam role name is over 64 character", async () => {
      const input: CreateJumpIamRoleNameCommand = {
        jumpIamRoleName: "1".repeat(54) + "a", // number of characters exceeding range limit
        originIamRoleArn: originIamRoleArn,
      };
      const result = createJumpIamRoleName(config)(input);
      expect(result.isErr()).toBe(true);
    });

    it("returns successful result even if Jump iam role name is empty", async () => {
      const input: CreateJumpIamRoleNameCommand = {
        jumpIamRoleName: "",
        originIamRoleArn: originIamRoleArn,
      };
      const result = createJumpIamRoleName(config)(input);
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if origin iam role name is empty", async () => {
      const input: CreateJumpIamRoleNameCommand = {
        jumpIamRoleName: "1".repeat(54), // number of characters within range excluding prefix etc
        originIamRoleArn: "",
      };
      const result = createJumpIamRoleName(config)(input);
      expect(result.isOk()).toBe(true);
    });
  });

  describe("createJumpIamRoleInAws", () => {
    const logger = createLogger("DEBUG", { moduleName: "iam-role" });
    it("creates Jump iam role in AWS", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: CreateJumpIamRoleCommand = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: originIamRoleArn,
        iamRoleName: `${config.roleNamePrefix}-jump-jumpTestServiceRole`,
      };
      const expected: CreatedJumpIamRole = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: originIamRoleArn,
        iamRoleName: `${config.roleNamePrefix}-jump-jumpTestServiceRole`,
        iamRoleArn: expect.any(String),
        createdAt: expect.any(String),
      };
      const resultAsync = createJumpIamRoleInAws(logger, config, iamClient)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failed result if Jump iam role name is invalid", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: CreateJumpIamRoleCommand = {
        jumpIamRoleName: "",
        originIamRoleArn: originIamRoleArn,
        iamRoleName: `${config.roleNamePrefix}-jump-jumpTestServiceRole`,
      };
      const resultAsync = createJumpIamRoleInAws(logger, config, iamClient)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if iam role name is invalid", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: CreateJumpIamRoleCommand = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: originIamRoleArn,
        iamRoleName: "",
      };
      const resultAsync = createJumpIamRoleInAws(logger, config, iamClient)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listJumpIamRoleAuditItemInAws", () => {
    const logger = createLogger("DEBUG", { moduleName: "iam-role" });

    it("lists Jump iam role audit item in AWS", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: ListJumpIamRoleAuditItemCommand = {
        attachedPolicyArns: [attachedPolicyArn],
      };
      const expected: ListJumpIamRoleAuditItem = {
        items: [expect.any(String)],
      };
      const resultAsync = listJumpIamRoleAuditItemInAws(logger, iamClient)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns successful result even if attachedPolicyArns are empty", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: ListJumpIamRoleAuditItemCommand = {
        attachedPolicyArns: [],
      };
      const resultAsync = listJumpIamRoleAuditItemInAws(logger, iamClient)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.items.length).toBe(0);
    });
  });

  describe("deleteJumpIamRoleInAws", () => {
    const logger = createLogger("DEBUG", { moduleName: "iam-role" });
    it("deletes Jump iam role in AWS", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: JumpIamRole = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: originIamRoleArn,
        iamRoleName: `${config.roleNamePrefix}-jump-jumpTestServiceRole`,
        iamRoleArn: "test-arn",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const expected = structuredClone(input);
      const resultAsync = deleteJumpIamRoleInAws(logger, iamClient)(input);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failed result if Jump iam role name is invalid", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: JumpIamRole = {
        jumpIamRoleName: "",
        originIamRoleArn: originIamRoleArn,
        iamRoleName: `${config.roleNamePrefix}-jump-jumpTestServiceRole`,
        iamRoleArn: "test-arn",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = deleteJumpIamRoleInAws(logger, iamClient)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if iam role name is invalid", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: JumpIamRole = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: originIamRoleArn,
        iamRoleName: "",
        iamRoleArn: "test-arn",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = deleteJumpIamRoleInAws(logger, iamClient)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if iam role arn is invalid", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: JumpIamRole = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: originIamRoleArn,
        iamRoleName: `${config.roleNamePrefix}-jump-jumpTestServiceRole`,
        iamRoleArn: "",
        createdAt: "2024-01-02T03:04:05.006Z",
      };
      const resultAsync = deleteJumpIamRoleInAws(logger, iamClient)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("returns failed result if created date is invalid", async () => {
      const iamClient = new IAMClient({ region: "us-west-2" });
      const input: JumpIamRole = {
        jumpIamRoleName: "jumpTestServiceRole",
        originIamRoleArn: originIamRoleArn,
        iamRoleName: `${config.roleNamePrefix}-jump-jumpTestServiceRole`,
        iamRoleArn: "test-arn",
        createdAt: "",
      };
      const resultAsync = deleteJumpIamRoleInAws(logger, iamClient)(input);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
