import { CreateRoleCommand, IAMClient } from "@aws-sdk/client-iam";
import { createLogger } from "@stamp-lib/stamp-logger";
import { describe, expect, it, vi } from "vitest";
import { IamRoleCatalogConfig } from "../../config";
import { buildGitHubSubjectClaim, createGitHubIamRoleInAws, createGitHubIamRoleName } from "./gitHubIamRole";

const baseConfig: IamRoleCatalogConfig = IamRoleCatalogConfig.parse({
  region: "us-west-2",
  iamRoleFactoryAccountId: "123456789012",
  iamRoleFactoryAccountRoleArn: "arn:aws:iam::123456789012:role/factory",
  gitHubOrgs: [
    { name: "org-a", id: "111" },
    { name: "org-b", id: "222" },
  ],
  policyNamePrefix: "stamp",
  roleNamePrefix: "stamp",
  awsAccountResourceTableName: "t-aws",
  targetIamRoleResourceTableName: "t-target",
  gitHubIamRoleResourceTableName: "t-github",
  jumpIamRoleResourceTableName: "t-jump",
});

describe("buildGitHubSubjectClaim", () => {
  const base = {
    gitHubOrgName: "org-a",
    gitHubOrgId: "111",
    repositoryName: "my-repo",
    repositoryId: "12345",
  } as const;

  it("builds the immutable whole-repository subject", () => {
    expect(buildGitHubSubjectClaim({ ...base, subjectType: "repository" })).toBe("repo:org-a@111/my-repo@12345:*");
  });

  it("builds the branch-scoped subject (branch names may contain slashes)", () => {
    expect(buildGitHubSubjectClaim({ ...base, subjectType: "branch", subjectValue: "release/v1" })).toBe(
      "repo:org-a@111/my-repo@12345:ref:refs/heads/release/v1"
    );
  });

  it("builds the tag-scoped subject", () => {
    expect(buildGitHubSubjectClaim({ ...base, subjectType: "tag", subjectValue: "v1.0.0" })).toBe(
      "repo:org-a@111/my-repo@12345:ref:refs/tags/v1.0.0"
    );
  });

  it("builds the environment-scoped subject", () => {
    expect(buildGitHubSubjectClaim({ ...base, subjectType: "environment", subjectValue: "production" })).toBe(
      "repo:org-a@111/my-repo@12345:environment:production"
    );
  });

  it("builds the pull_request subject", () => {
    expect(buildGitHubSubjectClaim({ ...base, subjectType: "pull_request" })).toBe("repo:org-a@111/my-repo@12345:pull_request");
  });

  it.each(["branch", "tag", "environment"] as const)("throws when subjectValue is missing for %s (guarded by schema upstream)", (subjectType) => {
    expect(() => buildGitHubSubjectClaim({ ...base, subjectType })).toThrow("subjectValue is required");
  });
});

describe("createGitHubIamRoleName (multi-org)", () => {
  it("creates the role name using the requested allowed org and resolves the org id from config", () => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "my-repo",
      gitHubOrgName: "org-b",
      repositoryId: "12345",
      subjectType: "repository",
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        repositoryName: "my-repo",
        gitHubOrgName: "org-b",
        repositoryId: "12345",
        gitHubOrgId: "222",
        roleSuffix: undefined,
        subjectType: "repository",
        subject: "repo:org-b@222/my-repo@12345:*",
        iamRoleName: "stamp-github-org-b-my-repo",
      });
    }
  });

  it("defaults subjectType to repository when omitted", () => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "my-repo",
      gitHubOrgName: "org-a",
      repositoryId: "12345",
    } as Parameters<ReturnType<typeof createGitHubIamRoleName>>[0]);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.subjectType).toBe("repository");
      expect(result.value.subject).toBe("repo:org-a@111/my-repo@12345:*");
    }
  });

  it("appends the role suffix to the role name", () => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "my-repo",
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      roleSuffix: "prod-deploy",
      subjectType: "repository",
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.iamRoleName).toBe("stamp-github-org-a-my-repo-prod-deploy");
      expect(result.value.roleSuffix).toBe("prod-deploy");
    }
  });

  it("rejects an org that is not on the allow-list", () => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "my-repo",
      gitHubOrgName: "not-allowed",
      repositoryId: "12345",
      subjectType: "repository",
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.userMessage).toContain("not allowed");
      expect(result.error.userMessage).toContain("org-a");
      expect(result.error.userMessage).toContain("org-b");
    }
  });

  it("rejects when the resulting role name would exceed 64 characters", () => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "r".repeat(60),
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      subjectType: "repository",
    });
    expect(result.isErr()).toBe(true);
  });

  it("rejects when the role name exceeds 64 characters only because of the suffix", () => {
    // "stamp-github-org-a-" (19) + repo (40) = 59 chars: fits without a
    // suffix, exceeds 64 with "-suffix1" appended.
    const repositoryName = "r".repeat(40);
    const withoutSuffix = createGitHubIamRoleName(baseConfig)({
      repositoryName,
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      subjectType: "repository",
    });
    expect(withoutSuffix.isOk()).toBe(true);
    const withSuffix = createGitHubIamRoleName(baseConfig)({
      repositoryName,
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      roleSuffix: "suffix1",
      subjectType: "repository",
    });
    expect(withSuffix.isErr()).toBe(true);
  });

  it("rejects empty repositoryName via runtime schema validation", () => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "",
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      subjectType: "repository",
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.userMessage).toContain("Failed to parse input");
    }
  });

  it("rejects empty gitHubOrgName via runtime schema validation", () => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "my-repo",
      gitHubOrgName: "",
      repositoryId: "12345",
      subjectType: "repository",
    });
    expect(result.isErr()).toBe(true);
  });

  it.each(["", "abc", "12a"])("rejects a non-numeric repositoryId (%j) via runtime schema validation", (repositoryId) => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "my-repo",
      gitHubOrgName: "org-a",
      repositoryId,
      subjectType: "repository",
    });
    expect(result.isErr()).toBe(true);
  });

  it.each(["-bad", "bad-", "has space", "has_underscore", "a".repeat(33)])("rejects an invalid roleSuffix (%j)", (roleSuffix) => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "my-repo",
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      roleSuffix,
      subjectType: "repository",
    });
    expect(result.isErr()).toBe(true);
  });

  it.each([
    ["branch", "main", "repo:org-a@111/my-repo@12345:ref:refs/heads/main"],
    ["tag", "v1.0.0", "repo:org-a@111/my-repo@12345:ref:refs/tags/v1.0.0"],
    ["environment", "production", "repo:org-a@111/my-repo@12345:environment:production"],
  ] as const)("builds a %s-scoped subject when subjectValue is given", (subjectType, subjectValue, expectedSubject) => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "my-repo",
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      subjectType,
      subjectValue,
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.subject).toBe(expectedSubject);
      expect(result.value.subjectType).toBe(subjectType);
      expect(result.value.subjectValue).toBe(subjectValue);
      // The scope does not change the role name — multiple scopes for one
      // repo are distinguished by roleSuffix.
      expect(result.value.iamRoleName).toBe("stamp-github-org-a-my-repo");
    }
  });

  it("builds the pull_request subject without a value", () => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "my-repo",
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      subjectType: "pull_request",
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.subject).toBe("repo:org-a@111/my-repo@12345:pull_request");
    }
  });

  it.each(["branch", "environment", "tag"] as const)("rejects %s without subjectValue via runtime schema validation", (subjectType) => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "my-repo",
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      subjectType,
    } as Parameters<ReturnType<typeof createGitHubIamRoleName>>[0]);
    expect(result.isErr()).toBe(true);
  });

  it.each(["repository", "pull_request"] as const)("rejects %s with a subjectValue via runtime schema validation", (subjectType) => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "my-repo",
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      subjectType,
      subjectValue: "main",
    } as unknown as Parameters<ReturnType<typeof createGitHubIamRoleName>>[0]);
    expect(result.isErr()).toBe(true);
  });

  it.each(["main*", "ma?in", "", "a".repeat(257)])("rejects an invalid subjectValue (%j)", (subjectValue) => {
    const result = createGitHubIamRoleName(baseConfig)({
      repositoryName: "my-repo",
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      subjectType: "branch",
      subjectValue,
    });
    expect(result.isErr()).toBe(true);
  });
});

describe("createGitHubIamRoleInAws (trust policy shape)", () => {
  const logger = createLogger("FATAL", { moduleName: "iam-role-test" });

  it("writes the immutable-claims sub condition to the assume-role policy", async () => {
    const send = vi.fn().mockResolvedValue({ Role: { Arn: "arn:aws:iam::123456789012:role/stamp-github-org-a-my-repo" } });
    const iamClient = { send } as unknown as IAMClient;

    const result = await createGitHubIamRoleInAws(
      logger,
      baseConfig,
      iamClient
    )({
      repositoryName: "my-repo",
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      gitHubOrgId: "111",
      subjectType: "repository",
      subject: "repo:org-a@111/my-repo@12345:*",
      iamRoleName: "stamp-github-org-a-my-repo",
    });

    expect(result.isOk()).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0] as CreateRoleCommand;
    expect(command).toBeInstanceOf(CreateRoleCommand);
    expect(command.input.RoleName).toBe("stamp-github-org-a-my-repo");

    const policy = JSON.parse(command.input.AssumeRolePolicyDocument as string);
    expect(policy).toEqual({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "",
          Effect: "Allow",
          Principal: {
            Federated: "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com",
          },
          Action: "sts:AssumeRoleWithWebIdentity",
          Condition: {
            StringLike: {
              "token.actions.githubusercontent.com:sub": "repo:org-a@111/my-repo@12345:*",
            },
          },
        },
      ],
    });
    // The sub condition must be a single string in the new immutable format —
    // no legacy `repo:org/repo:*` fallback.
    const sub = policy.Statement[0].Condition.StringLike["token.actions.githubusercontent.com:sub"];
    expect(typeof sub).toBe("string");

    if (result.isOk()) {
      expect(result.value.iamRoleArn).toBe("arn:aws:iam::123456789012:role/stamp-github-org-a-my-repo");
      expect(result.value.subject).toBe("repo:org-a@111/my-repo@12345:*");
    }
  });

  it("writes a branch-scoped sub condition to the assume-role policy", async () => {
    const send = vi.fn().mockResolvedValue({ Role: { Arn: "arn:aws:iam::123456789012:role/stamp-github-org-a-my-repo-deploy" } });
    const iamClient = { send } as unknown as IAMClient;

    const result = await createGitHubIamRoleInAws(
      logger,
      baseConfig,
      iamClient
    )({
      repositoryName: "my-repo",
      gitHubOrgName: "org-a",
      repositoryId: "12345",
      gitHubOrgId: "111",
      roleSuffix: "deploy",
      subjectType: "branch",
      subjectValue: "main",
      subject: "repo:org-a@111/my-repo@12345:ref:refs/heads/main",
      iamRoleName: "stamp-github-org-a-my-repo-deploy",
    });

    expect(result.isOk()).toBe(true);
    const command = send.mock.calls[0][0] as CreateRoleCommand;
    const policy = JSON.parse(command.input.AssumeRolePolicyDocument as string);
    expect(policy.Statement[0].Condition.StringLike["token.actions.githubusercontent.com:sub"]).toBe(
      "repo:org-a@111/my-repo@12345:ref:refs/heads/main"
    );
  });
});
