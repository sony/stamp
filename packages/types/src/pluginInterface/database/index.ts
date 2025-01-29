import { ApprovalFlowDBProvider } from "./approvalFlow";
import { ApprovalRequestDBProvider } from "./approvalRequest";
import { CatalogDBProvider } from "./catalog";
import { ResourceDBProvider } from "./resource";
export * from "./catalog";
export * from "./approvalFlow";
export * from "./approvalRequest";
export * from "./resource";
export * from "./error";

export type DBProvider = {
  approvalFlowDB: ApprovalFlowDBProvider;
  approvalRequestDB: ApprovalRequestDBProvider;
  catalogDB: CatalogDBProvider;
  resourceDB: ResourceDBProvider;
};
