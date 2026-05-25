import { describe, expect, it } from "vitest";
import { IamRoleCatalogConfig, IamRoleCatalogConfigInput } from "./config";

const baseConfigInput = {
  region: "us-west-2",
  iamRoleFactoryAccountId: "123456789012",
  iamRoleFactoryAccountRoleArn: "arn:aws:iam::123456789012:role/factory",
  policyNamePrefix: "stamp",
  roleNamePrefix: "stamp",
  awsAccountResourceTableName: "t-aws",
  targetIamRoleResourceTableName: "t-target",
  gitHubIamRoleResourceTableName: "t-github",
  jumpIamRoleResourceTableName: "t-jump",
} satisfies Partial<IamRoleCatalogConfigInput>;

describe("IamRoleCatalogConfig", () => {
  it("accepts a single allowed org", () => {
    const cfg = IamRoleCatalogConfig.parse({ ...baseConfigInput, gitHubOrgNames: ["org-a"] });
    expect(cfg.gitHubOrgNames).toEqual(["org-a"]);
  });

  it("accepts multiple allowed orgs", () => {
    const cfg = IamRoleCatalogConfig.parse({ ...baseConfigInput, gitHubOrgNames: ["org-a", "org-b"] });
    expect(cfg.gitHubOrgNames).toEqual(["org-a", "org-b"]);
  });

  it("rejects when gitHubOrgNames is missing", () => {
    const result = IamRoleCatalogConfig.safeParse(baseConfigInput);
    expect(result.success).toBe(false);
  });

  it("rejects an empty gitHubOrgNames array", () => {
    const result = IamRoleCatalogConfig.safeParse({ ...baseConfigInput, gitHubOrgNames: [] });
    expect(result.success).toBe(false);
  });
});
