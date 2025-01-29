import { CatalogInfoOnDB } from "../../models/catalog";
import { ResultAsync } from "neverthrow";
import { DBError } from "./error";
import { Option } from "@stamp-lib/stamp-option";

export type CatalogDBGetByIdResult = ResultAsync<Option<CatalogInfoOnDB>, DBError>;
export type CatalogDBListAllResult = ResultAsync<Array<CatalogInfoOnDB>, DBError>;
export type CatalogDBSetResult = ResultAsync<CatalogInfoOnDB, DBError>;
export type CatalogDBDeleteResult = ResultAsync<void, DBError>;

export type CatalogDBProvider = {
  getById(id: string): CatalogDBGetByIdResult;
  listAll(): CatalogDBListAllResult;
  set(catalog: CatalogInfoOnDB): CatalogDBSetResult;
  delete(id: string): CatalogDBDeleteResult;
};
