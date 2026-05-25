import { describe, expect, it } from "vitest";
import { IamRoleCatalogConfig } from "../../config";
import { createGitHubIamRoleName } from "./gitHubIamRole";

const baseConfig: IamRoleCatalogConfig = IamRoleCatalogConfig.parse({
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
});

describe("createGitHubIamRoleName (multi-org)", () => {
  it("creates the role name using the requested allowed org", () => {
    const result = createGitHubIamRoleName(baseConfig)({ repositoryName: "my-repo", gitHubOrgName: "org-b" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        repositoryName: "my-repo",
        gitHubOrgName: "org-b",
        iamRoleName: "stamp-github-org-b-my-repo",
      });
    }
  });

  it("rejects an org that is not on the allow-list", () => {
    const result = createGitHubIamRoleName(baseConfig)({ repositoryName: "my-repo", gitHubOrgName: "not-allowed" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.userMessage).toContain("not allowed");
      expect(result.error.userMessage).toContain("org-a");
      expect(result.error.userMessage).toContain("org-b");
    }
  });

  it("rejects when the resulting role name would exceed 64 characters", () => {
    const result = createGitHubIamRoleName(baseConfig)({ repositoryName: "r".repeat(60), gitHubOrgName: "org-a" });
    expect(result.isErr()).toBe(true);
  });
});
