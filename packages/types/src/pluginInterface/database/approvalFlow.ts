import { ApprovalFlowInfoOnDB, CatalogId, ApprovalFlowId } from "../../models";
import { ResultAsync } from "neverthrow";
import { DBError } from "./error";
import { Option } from "@stamp-lib/stamp-option";

export type ApprovalFlowDBGetByIdResult = ResultAsync<Option<ApprovalFlowInfoOnDB>, DBError>;
export type ApprovalFlowDBListResult = ResultAsync<Array<ApprovalFlowInfoOnDB>, DBError>;
export type ApprovalFlowDBSetResult = ResultAsync<ApprovalFlowInfoOnDB, DBError>;
export type ApprovalFlowDBDeleteResult = ResultAsync<void, DBError>;

export type ApprovalFlowDBProvider = {
  getById(catalogId: CatalogId, approvalFlowId: ApprovalFlowId): ApprovalFlowDBGetByIdResult;
  listByCatalogId(catalogId: CatalogId): ApprovalFlowDBListResult;
  set(approvalFlow: ApprovalFlowInfoOnDB): ApprovalFlowDBSetResult;
  delete(catalogId: CatalogId, approvalFlowId: ApprovalFlowId): ApprovalFlowDBDeleteResult;
};
