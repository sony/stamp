import { ApprovalFlowConfig, CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { IamRoleCatalogConfig, IamRoleCatalogConfigInput } from "./config";
import { createAwsAccountResourceHandler } from "./handlers/awsAccountResource";
import { createGitHubIamRoleResourceHandler } from "./handlers/gitHubIamRoleResource";
import { createIamRolePromoteRequestHandler } from "./handlers/iamRolePromoteRequest";
import { createJumpIamRolePromoteRequestHandler } from "./handlers/jumpIamRolePromoteRequest";
import { createJumpIamRoleResourceHandler } from "./handlers/jumpIamRoleResource";
import { createTargetIamRoleResourceHandler } from "./handlers/targetIamRoleResource";

export function createIamRoleCatalog(iamRoleCatalogConfigInput: IamRoleCatalogConfigInput): CatalogConfig {
  const iamRoleCatalogConfig = IamRoleCatalogConfig.parse(iamRoleCatalogConfigInput);
  const iamRolePromoteRequestConfig: ApprovalFlowConfig = {
    id: "iam-role-promote-request",
    name: "GitHub IAM Role Promote",
    description: "GitHub IAM Role Promote Request",
    inputParams: [],
    inputResources: [
      { resourceTypeId: "github-iam-role", description: "Choose a GitHub repository" },
      { resourceTypeId: "aws-account", description: "Choose a target AWS account" },
      { resourceTypeId: "target-iam-role", parentResourceTypeId: "aws-account", description: "Choose a target IAM Role to AssumeRole from GitHub Actions" },
    ],
    approver: { approverType: "resource", resourceTypeId: "aws-account" },
    handlers: createIamRolePromoteRequestHandler(iamRoleCatalogConfig),
    enableRevoke: true,
    autoRevoke: { enabled: true, defaultSettings: { required: false } },
  };

  const jumpIamRolePromoteRequestConfig: ApprovalFlowConfig = {
    id: "jump-iam-role-promote-request",
    name: "Jump IAM Role Promote",
    description: "Jump IAM Role Promote Request",
    inputParams: [],
    inputResources: [
      { resourceTypeId: "jump-iam-role" },
      { resourceTypeId: "aws-account" },
      { resourceTypeId: "target-iam-role", parentResourceTypeId: "aws-account" },
    ],
    approver: { approverType: "resource", resourceTypeId: "aws-account" },
    handlers: createJumpIamRolePromoteRequestHandler(iamRoleCatalogConfig),
    enableRevoke: true,
    autoRevoke: { enabled: true, defaultSettings: { required: false } },
  };

  const gitHubIamRoleResourceTypeConfig: ResourceTypeConfig = {
    id: "github-iam-role",
    name: "GitHub IAM Role",
    description: "GitHub IAM Role",
    createParams: [{ type: "string", id: "repositoryName", name: "Repository Name", required: true }],
    infoParams: [
      { type: "string", id: "repositoryName", name: "Repository Name", edit: false },
      { type: "string", id: "iamRoleArn", name: "IAM Role Arn", edit: false },
    ],
    handlers: createGitHubIamRoleResourceHandler(iamRoleCatalogConfig),
    isCreatable: true,
    isDeletable: true,
    isUpdatable: false,
    ownerManagement: true,
    approverManagement: false,
    anyoneCanCreate: true,
  };

  const jumpIamRoleResourceTypeConfig: ResourceTypeConfig = {
    id: "jump-iam-role",
    name: "Jump IAM Role",
    description: "Jump IAM Role",
    createParams: [
      { type: "string", id: "jumpIamRoleName", name: "Jump IAM Role Name", required: true },
      { type: "string", id: "originIamRoleArn", name: "Origin IAM Role Arn", required: true },
    ],
    infoParams: [
      { type: "string", id: "originIamRoleArn", name: "Origin IAM Role Arn", edit: false },
      { type: "string", id: "iamRoleArn", name: "IAM Role Arn", edit: false },
    ],
    handlers: createJumpIamRoleResourceHandler(iamRoleCatalogConfig),
    isCreatable: true,
    isDeletable: true,
    isUpdatable: false,
    ownerManagement: true,
    approverManagement: false,
    anyoneCanCreate: true,
  };

  const awsAccountResourceTypeConfig: ResourceTypeConfig = {
    id: "aws-account",
    name: "AWS Account",
    description: "AWS Account",
    createParams: [
      { type: "string", id: "name", name: "Name", required: true },
      { type: "string", id: "accountId", name: "AWS Account ID", required: true },
    ],
    infoParams: [{ type: "string", id: "accountId", name: "AWS Account ID", edit: false }],
    handlers: createAwsAccountResourceHandler(iamRoleCatalogConfig),
    isCreatable: true,
    isDeletable: true,
    isUpdatable: false,
    ownerManagement: true,
    approverManagement: true,
  };

  const targetIamRoleResourceTypeConfig: ResourceTypeConfig = {
    id: "target-iam-role",
    name: "Target IAM Role",
    description: "Target IAM Role",
    createParams: [{ type: "string", id: "iamRoleName", name: "IAM Role Name", required: true }],
    infoParams: [{ type: "string", id: "iamRoleName", name: "IAM Role Name", edit: false }],
    parentResourceTypeId: "aws-account",
    handlers: createTargetIamRoleResourceHandler(iamRoleCatalogConfig),
    isCreatable: true,
    isDeletable: true,
    isUpdatable: false,
    ownerManagement: false,
    approverManagement: false,
  };

  const iamRoleCatalog: CatalogConfig = {
    id: "iam-role-catalog",
    name: "IAM Role Catalog",
    description: "IAM Role Catalog",
    approvalFlows: [iamRolePromoteRequestConfig, jumpIamRolePromoteRequestConfig],
    resourceTypes: [gitHubIamRoleResourceTypeConfig, jumpIamRoleResourceTypeConfig, awsAccountResourceTypeConfig, targetIamRoleResourceTypeConfig],
  };

  return iamRoleCatalog;
}
