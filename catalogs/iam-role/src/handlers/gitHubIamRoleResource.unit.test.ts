import { describe, expect, it } from "vitest";
import { IamRoleCatalogConfig } from "../config";
import { buildResourceOutput, createGitHubIamRoleResourceHandler, resolveDisplayFields } from "./gitHubIamRoleResource";

const makeConfig = (overrides: Partial<Record<string, unknown>> = {}): IamRoleCatalogConfig =>
  IamRoleCatalogConfig.parse({
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
    ...overrides,
  });

describe("resolveDisplayFields / buildResourceOutput", () => {
  it("legacy record (no gitHubOrgName attribute) returns undefined org (no silent fallback)", () => {
    const display = resolveDisplayFields({ repositoryName: "old-repo", iamRoleName: "x", iamRoleArn: "y", createdAt: "2024-01-01" });
    expect(display).toEqual({ repositoryName: "old-repo", gitHubOrgName: undefined, isLegacy: true });
  });

  it("legacy record exposes bare repo name from the PK without guessing the org", () => {
    const display = resolveDisplayFields({ repositoryName: "old-repo", iamRoleName: "x", iamRoleArn: "y", createdAt: "2024-01-01" });
    expect(display.gitHubOrgName).toBeUndefined();
    expect(display.repositoryName).toBe("old-repo");
    expect(display.isLegacy).toBe(true);
  });

  it("compound record exposes bare repo name and explicit org", () => {
    const display = resolveDisplayFields({
      repositoryName: "org-b/new-repo",
      gitHubRepositoryName: "new-repo",
      gitHubOrgName: "org-b",
      iamRoleName: "x",
      iamRoleArn: "y",
      createdAt: "2024-01-01",
    });
    expect(display).toEqual({ repositoryName: "new-repo", gitHubOrgName: "org-b", isLegacy: false });
  });

  it("buildResourceOutput keeps bare display name for legacy records and omits new params", () => {
    const output = buildResourceOutput({ repositoryName: "legacy-repo", iamRoleName: "r", iamRoleArn: "arn", createdAt: "2024-01-01" });
    expect(output.resourceId).toBe("legacy-repo");
    expect(output.name).toBe("legacy-repo");
    expect(output.params).toEqual({
      repositoryName: "legacy-repo",
      iamRoleArn: "arn",
    });
    expect(output.params.gitHubOrgName).toBeUndefined();
    expect(output.params.repositoryId).toBeUndefined();
    expect(output.params.subject).toBeUndefined();
  });

  it("buildResourceOutput uses compound display name for multi-org records (so same repo name across orgs is distinguishable in UI)", () => {
    const output = buildResourceOutput({
      repositoryName: "org-b/shared-repo",
      gitHubRepositoryName: "shared-repo",
      gitHubOrgName: "org-b",
      iamRoleName: "r",
      iamRoleArn: "arn",
      createdAt: "2024-01-01",
    });
    expect(output.resourceId).toBe("org-b/shared-repo");
    expect(output.name).toBe("org-b/shared-repo");
    expect(output.params).toEqual({
      repositoryName: "shared-repo",
      gitHubOrgName: "org-b",
      iamRoleArn: "arn",
    });
  });

  it("buildResourceOutput exposes immutable-claims attributes when present", () => {
    const output = buildResourceOutput({
      repositoryName: "org-b/new-repo",
      gitHubRepositoryName: "new-repo",
      gitHubOrgName: "org-b",
      gitHubRepositoryId: "12345",
      gitHubOrgId: "222",
      subjectType: "repository",
      subject: "repo:org-b@222/new-repo@12345:*",
      iamRoleName: "r",
      iamRoleArn: "arn",
      createdAt: "2024-01-01",
    });
    expect(output.params).toEqual({
      repositoryName: "new-repo",
      gitHubOrgName: "org-b",
      repositoryId: "12345",
      subjectType: "repository",
      subject: "repo:org-b@222/new-repo@12345:*",
      iamRoleArn: "arn",
    });
  });

  it("buildResourceOutput appends the role suffix to the display name so multiple roles per repo stay distinguishable", () => {
    const output = buildResourceOutput({
      repositoryName: "org-b/new-repo/prod-deploy",
      gitHubRepositoryName: "new-repo",
      gitHubOrgName: "org-b",
      gitHubRepositoryId: "12345",
      gitHubOrgId: "222",
      roleSuffix: "prod-deploy",
      subjectType: "repository",
      subject: "repo:org-b@222/new-repo@12345:*",
      iamRoleName: "r",
      iamRoleArn: "arn",
      createdAt: "2024-01-01",
    });
    expect(output.resourceId).toBe("org-b/new-repo/prod-deploy");
    expect(output.name).toBe("org-b/new-repo/prod-deploy");
    expect(output.params.roleSuffix).toBe("prod-deploy");
  });
});

describe("createResource input validation (short-circuits before any AWS call)", () => {
  const cfg = makeConfig();
  const createResource = createGitHubIamRoleResourceHandler(cfg).createResource;
  const baseInput = {
    resourceTypeId: "github-iam-role",
    inputParams: {
      gitHubOrgName: "org-a",
      repositoryName: "my-repo",
      repositoryId: "12345",
    },
  };

  it("rejects a missing repositoryId", async () => {
    const result = await createResource({
      ...baseInput,
      inputParams: { gitHubOrgName: "org-a", repositoryName: "my-repo" },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.userMessage).toContain("repositoryId");
    }
  });

  it.each(["", "abc", "12a", "1 2"])("rejects a non-numeric repositoryId (%j)", async (repositoryId) => {
    const result = await createResource({
      ...baseInput,
      inputParams: { ...baseInput.inputParams, repositoryId },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.userMessage).toContain("repositoryId");
    }
  });

  it.each(["owner/repo", "repo name", "repo@123", "repo:ref"])("rejects a repositoryName with delimiter characters (%j)", async (badRepositoryName) => {
    const result = await createResource({
      ...baseInput,
      inputParams: { ...baseInput.inputParams, repositoryName: badRepositoryName },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.userMessage).toContain("repositoryName");
    }
  });

  it.each(["org/a", "org a", "org@123", "org_a"])("rejects a gitHubOrgName with characters GitHub does not allow (%j)", async (badOrgName) => {
    const result = await createResource({
      ...baseInput,
      inputParams: { ...baseInput.inputParams, gitHubOrgName: badOrgName },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.userMessage).not.toContain("not allowed");
    }
  });

  it("trims a padded gitHubOrgName before the allow-list lookup", async () => {
    // With a padded-but-allowed org, validation must proceed past the
    // allow-list check; the invalid repositoryId then short-circuits before
    // any AWS call, proving the trimmed value was used for the lookup.
    const result = await createResource({
      ...baseInput,
      inputParams: { ...baseInput.inputParams, gitHubOrgName: " org-a ", repositoryId: "not-numeric" },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.userMessage).not.toContain("not allowed");
      expect(result.error.userMessage).toContain("repositoryId");
    }
  });

  it("rejects an org that is not on the allow-list, listing allowed org names", async () => {
    const result = await createResource({
      ...baseInput,
      inputParams: { ...baseInput.inputParams, gitHubOrgName: "org-c" },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.userMessage).toContain("org-a");
      expect(result.error.userMessage).toContain("org-b");
    }
  });

  it.each(["-bad", "bad-", "has space", "a".repeat(33)])("rejects an invalid roleSuffix (%j)", async (roleSuffix) => {
    const result = await createResource({
      ...baseInput,
      inputParams: { ...baseInput.inputParams, roleSuffix },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.userMessage).toContain("roleSuffix");
    }
  });

  it.each(["bogus", "Branch", "repo"])("rejects an unknown subjectType (%j)", async (subjectType) => {
    const result = await createResource({
      ...baseInput,
      inputParams: { ...baseInput.inputParams, subjectType },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.userMessage).toContain("subjectType");
    }
  });

  it.each(["branch", "environment", "tag"])("rejects subjectType %j without a subjectValue", async (subjectType) => {
    const result = await createResource({
      ...baseInput,
      inputParams: { ...baseInput.inputParams, subjectType },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.userMessage).toContain("subjectValue");
      expect(result.error.userMessage).toContain("required");
    }
  });

  it.each([
    ["repository", "main"],
    ["pull_request", "main"],
  ])("rejects subjectType %j with a subjectValue (%j)", async (subjectType, subjectValue) => {
    const result = await createResource({
      ...baseInput,
      inputParams: { ...baseInput.inputParams, subjectType, subjectValue },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.userMessage).toContain("must be empty");
    }
  });

  it("rejects a subjectValue omitted-with-value pairing even when subjectType is omitted (defaults to repository)", async () => {
    const result = await createResource({
      ...baseInput,
      inputParams: { ...baseInput.inputParams, subjectValue: "main" },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.userMessage).toContain("must be empty");
    }
  });

  it.each(["release*", "ma?in", "a".repeat(257)])("rejects a subjectValue with wildcard or over-length content (%j)", async (subjectValue) => {
    const result = await createResource({
      ...baseInput,
      inputParams: { ...baseInput.inputParams, subjectType: "branch", subjectValue },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.userMessage).toContain("subjectValue");
    }
  });

  it("buildResourceOutput exposes subjectValue when present", () => {
    const output = buildResourceOutput({
      repositoryName: "org-a/my-repo/deploy",
      gitHubRepositoryName: "my-repo",
      gitHubOrgName: "org-a",
      gitHubRepositoryId: "12345",
      gitHubOrgId: "111",
      roleSuffix: "deploy",
      subjectType: "branch",
      subjectValue: "main",
      subject: "repo:org-a@111/my-repo@12345:ref:refs/heads/main",
      iamRoleName: "r",
      iamRoleArn: "arn",
      createdAt: "2024-01-01",
    });
    expect(output.params.subjectValue).toBe("main");
    expect(output.params.subjectType).toBe("branch");
  });
});
