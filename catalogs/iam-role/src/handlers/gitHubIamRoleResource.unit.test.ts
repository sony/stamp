import { describe, expect, it } from "vitest";
import { IamRoleCatalogConfig } from "../config";
import { buildResourceOutput, resolveDisplayFields } from "./gitHubIamRoleResource";

const makeConfig = (overrides: Partial<Record<string, unknown>> = {}): IamRoleCatalogConfig =>
  IamRoleCatalogConfig.parse({
    region: "us-west-2",
    iamRoleFactoryAccountId: "123456789012",
    iamRoleFactoryAccountRoleArn: "arn:aws:iam::123456789012:role/factory",
    gitHubOrgNames: ["org-a", "org-b"],
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
    const cfg = makeConfig({ gitHubOrgNames: ["org-b", "org-a"] });
    const display = resolveDisplayFields(
      { repositoryName: "old-repo", iamRoleName: "x", iamRoleArn: "y", createdAt: "2024-01-01" },
      cfg
    );
    expect(display).toEqual({ repositoryName: "old-repo", gitHubOrgName: undefined, isLegacy: true });
  });

  it("legacy record exposes bare repo name from the PK without guessing the org", () => {
    const cfg = makeConfig({ gitHubOrgNames: ["org-a", "org-b"] });
    const display = resolveDisplayFields(
      { repositoryName: "old-repo", iamRoleName: "x", iamRoleArn: "y", createdAt: "2024-01-01" },
      cfg
    );
    expect(display.gitHubOrgName).toBeUndefined();
    expect(display.repositoryName).toBe("old-repo");
    expect(display.isLegacy).toBe(true);
  });

  it("compound record exposes bare repo name and explicit org", () => {
    const cfg = makeConfig();
    const display = resolveDisplayFields(
      {
        repositoryName: "org-b/new-repo",
        gitHubRepositoryName: "new-repo",
        gitHubOrgName: "org-b",
        iamRoleName: "x",
        iamRoleArn: "y",
        createdAt: "2024-01-01",
      },
      cfg
    );
    expect(display).toEqual({ repositoryName: "new-repo", gitHubOrgName: "org-b", isLegacy: false });
  });

  it("buildResourceOutput keeps bare display name for legacy records and omits gitHubOrgName from params", () => {
    const cfg = makeConfig({ gitHubOrgNames: ["org-a"] });
    const output = buildResourceOutput(
      { repositoryName: "legacy-repo", iamRoleName: "r", iamRoleArn: "arn", createdAt: "2024-01-01" },
      cfg
    );
    expect(output.resourceId).toBe("legacy-repo");
    expect(output.name).toBe("legacy-repo");
    expect(output.params).toEqual({
      repositoryName: "legacy-repo",
      iamRoleArn: "arn",
    });
    expect(output.params.gitHubOrgName).toBeUndefined();
  });

  it("buildResourceOutput uses compound display name for multi-org records (so same repo name across orgs is distinguishable in UI)", () => {
    const cfg = makeConfig();
    const output = buildResourceOutput(
      {
        repositoryName: "org-b/shared-repo",
        gitHubRepositoryName: "shared-repo",
        gitHubOrgName: "org-b",
        iamRoleName: "r",
        iamRoleArn: "arn",
        createdAt: "2024-01-01",
      },
      cfg
    );
    expect(output.resourceId).toBe("org-b/shared-repo");
    expect(output.name).toBe("org-b/shared-repo");
    expect(output.params).toEqual({
      repositoryName: "shared-repo",
      gitHubOrgName: "org-b",
      iamRoleArn: "arn",
    });
  });
});
