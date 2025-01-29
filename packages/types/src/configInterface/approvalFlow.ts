import { ApprovalFlowInfoOnConfig } from "../models";
import { ResultAsync } from "neverthrow";
import { ConfigError } from "./error";
import { Option } from "@stamp-lib/stamp-option";

export type GetApprovalFlowInfoOnConfigResult = ResultAsync<Option<ApprovalFlowInfoOnConfig>, ConfigError>;
export type ListApprovalFlowInfoOnConfigResult = ResultAsync<Array<ApprovalFlowInfoOnConfig>, ConfigError>;

export type GetApprovalFlowInfoConfig = (catalogId: string, approvalFlowId: string) => GetApprovalFlowInfoOnConfigResult;
export type ListApprovalFlowConfigInfoByCatalogId = (catalogId: string) => ListApprovalFlowInfoOnConfigResult;

export type ApprovalFlowConfigProvider = {
  getInfo: GetApprovalFlowInfoConfig;
  listInfoByCatalogId: ListApprovalFlowConfigInfoByCatalogId;
};
