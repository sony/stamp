import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";

export type StampUser = StampHubRouterOutput["systemRequest"]["user"]["get"];
export type StampAccountLink = StampHubRouterOutput["systemRequest"]["accountLink"]["get"];
export type StampAccountLinkSession = StampHubRouterOutput["systemRequest"]["accountLinkSession"]["get"];

export type Group = StampHubRouterOutput["userRequest"]["group"]["get"];
export type GroupMembership = StampHubRouterOutput["userRequest"]["group"]["listGroupMemberShipByGroup"]["items"][0];

export type Catalog = StampHubRouterOutput["userRequest"]["catalog"]["get"];

export type ResourceType = StampHubRouterOutput["userRequest"]["resourceType"]["get"];
export type Resource = StampHubRouterOutput["userRequest"]["resource"]["get"];
export type ResourceOutline = StampHubRouterOutput["userRequest"]["resource"]["listOutlines"]["items"][0];
export type ResourceAuditItems = StampHubRouterOutput["userRequest"]["resource"]["listAuditItem"]["auditItems"][0];

export type ApprovalFlow = StampHubRouterOutput["userRequest"]["approvalFlow"]["get"];
export type ApprovalRequest = StampHubRouterOutput["userRequest"]["approvalRequest"]["listByApprovalFlowId"]["items"][0];
