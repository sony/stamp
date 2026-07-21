import { describe, expect, it } from "vitest";
import { IamRoleCatalogConfig, IamRoleCatalogConfigInput, findAllowedGitHubOrg } from "./config";

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
    const cfg = IamRoleCatalogConfig.parse({ ...baseConfigInput, gitHubOrgs: [{ name: "org-a", id: "111" }] });
    expect(cfg.gitHubOrgs).toEqual([{ name: "org-a", id: "111" }]);
  });

  it("accepts multiple allowed orgs", () => {
    const cfg = IamRoleCatalogConfig.parse({
      ...baseConfigInput,
      gitHubOrgs: [
        { name: "org-a", id: "111" },
        { name: "org-b", id: "222" },
      ],
    });
    expect(cfg.gitHubOrgs).toEqual([
      { name: "org-a", id: "111" },
      { name: "org-b", id: "222" },
    ]);
  });

  it("rejects when gitHubOrgs is missing", () => {
    const result = IamRoleCatalogConfig.safeParse(baseConfigInput);
    expect(result.success).toBe(false);
  });

  it("rejects the pre-immutable-claims gitHubOrgNames shape", () => {
    const result = IamRoleCatalogConfig.safeParse({ ...baseConfigInput, gitHubOrgNames: ["org-a"] });
    expect(result.success).toBe(false);
  });

  it("rejects an empty gitHubOrgs array", () => {
    const result = IamRoleCatalogConfig.safeParse({ ...baseConfigInput, gitHubOrgs: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an org with an empty name", () => {
    const result = IamRoleCatalogConfig.safeParse({ ...baseConfigInput, gitHubOrgs: [{ name: "", id: "111" }] });
    expect(result.success).toBe(false);
  });

  it.each(["", "abc", "12a", "1.5", " 123"])("rejects a non-numeric org id (%j)", (id) => {
    const result = IamRoleCatalogConfig.safeParse({ ...baseConfigInput, gitHubOrgs: [{ name: "org-a", id }] });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate org names (ambiguous name→id lookup)", () => {
    const result = IamRoleCatalogConfig.safeParse({
      ...baseConfigInput,
      gitHubOrgs: [
        { name: "org-a", id: "111" },
        { name: "org-a", id: "222" },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("findAllowedGitHubOrg", () => {
  const cfg = IamRoleCatalogConfig.parse({
    ...baseConfigInput,
    gitHubOrgs: [
      { name: "org-a", id: "111" },
      { name: "org-b", id: "222" },
    ],
  });

  it("returns the matching org with its id", () => {
    expect(findAllowedGitHubOrg(cfg, "org-b")).toEqual({ name: "org-b", id: "222" });
  });

  it("returns undefined for an org not in the allow-list", () => {
    expect(findAllowedGitHubOrg(cfg, "org-c")).toBeUndefined();
  });
});
