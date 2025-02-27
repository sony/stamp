import { ApprovalFlowConfig, CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { IamIdcCatalogConfig, IamIdcCatalogConfigInput } from "./config";
import { createAwsAccountResourceHandler } from "./handlers/awsAccountResourceHandler";
import { createIamIdcApplicationHandler } from "./handlers/iamIdcApprovalFlowHandler";
import { createIamIdcPermissionResourceHandler } from "./handlers/iamIdcPermissionResourceHandler";

export function createIamIdcCatalog(iamIdcCatalogConfigInput: IamIdcCatalogConfigInput): CatalogConfig {
  const iamIdcCatalogConfig = IamIdcCatalogConfig.parse(iamIdcCatalogConfigInput);
  const iamIdcApplicationConfig: ApprovalFlowConfig = {
    id: "iam-idc-permission-request",
    name: "IAM IdC Permission Request",
    description: "IAM IdC Permission Request",
    inputParams: [
      {
        type: "string",
        id: "userName",
        name: "User Name",
        required: true,
        description: "Enter IAM Identity Center user name to grant permission",
      },
    ],
    inputResources: [
      { resourceTypeId: "iam-idc-aws-account", description: "Choose a target AWS account" },
      {
        resourceTypeId: "iam-idc-permission",
        parentResourceTypeId: "iam-idc-aws-account",
        description: "Choose a permission you want to use on the AWS account",
      },
    ],
    approver: { approverType: "resource", resourceTypeId: "iam-idc-aws-account" },
    handlers: createIamIdcApplicationHandler(iamIdcCatalogConfig),
    enableRevoke: true,
    autoRevoke: { enabled: true, defaultSettings: { required: false } },
  };

  // ResourceTypeConfig to manage "Resource (1) AWS Account"
  const iamIdcAwsAccountResourceTypeConfig: ResourceTypeConfig = {
    id: "iam-idc-aws-account",
    name: "IAM IdC AWS Account",
    description: "IAM IdC AWS Account",
    createParams: [
      { type: "string", id: "name", name: "Name", required: true },
      { type: "string", id: "accountId", name: "AWS Account ID", required: true },
    ],
    infoParams: [{ type: "string", id: "accountId", name: "AWS Account ID", edit: false }],
    handlers: createAwsAccountResourceHandler(iamIdcCatalogConfig),
    isCreatable: true,
    isDeletable: true,
    isUpdatable: false,
    ownerManagement: true,
    approverManagement: true,
  };

  // ResourceTypeConfig to manage "Resource (2) Permission"
  const iamIdcPermissionResourceTypeConfig: ResourceTypeConfig = {
    id: "iam-idc-permission",
    name: "IAM IdC Permission",
    description: "IAM IdC Permission",
    createParams: [
      { type: "string", id: "name", name: "Name", required: true },
      { type: "string", id: "description", name: "description", required: true },
      { type: "string", id: "permissionSetNameId", name: "Permission Set Name Id", required: true },
      { type: "string", id: "sessionDuration", name: "Session Duration", required: true },
      { type: "string[]", id: "managedIamPolicyNames", name: "Managed Policy Names", required: false },
      { type: "string[]", id: "customIamPolicyNames", name: "Custom IAM Policy Names", required: false },
    ],
    infoParams: [
      { type: "string", id: "description", name: "description", edit: false },
      { type: "string", id: "sessionDuration", name: "Session Duration", edit: false },
      { type: "string", id: "permissionSetNameId", name: "Permission Set Name Id", edit: false },
      { type: "string[]", id: "managedIamPolicyNames", name: "Managed IAM Policy Names", edit: false },
      { type: "string[]", id: "customIamPolicyNames", name: "Custom IAM Policy Names", edit: false },
    ],
    parentResourceTypeId: "iam-idc-aws-account",
    handlers: createIamIdcPermissionResourceHandler(iamIdcCatalogConfig),
    isCreatable: true,
    isDeletable: true,
    isUpdatable: false,
    ownerManagement: false,
    approverManagement: false,
  };

  const iamIdcCatalog: CatalogConfig = {
    id: "iam-idc-catalog",
    name: "IAM IdC Catalog",
    description: "IAM IdC Catalog",
    approvalFlows: [iamIdcApplicationConfig],
    resourceTypes: [iamIdcAwsAccountResourceTypeConfig, iamIdcPermissionResourceTypeConfig],
  };

  return iamIdcCatalog;
}
