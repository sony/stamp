import { CatalogInfoOnConfig, CatalogConfig } from "../models/catalog";
import { ResultAsync } from "neverthrow";
import { ConfigError } from "./error";
import { Option } from "@stamp-lib/stamp-option";

export type GetCatalogInfoOnConfigResult = ResultAsync<Option<CatalogInfoOnConfig>, ConfigError>;
export type ListCatalogInfoOnConfigResult = ResultAsync<Array<CatalogInfoOnConfig>, ConfigError>;

export type GetCatalogInfoOnConfig = (id: string) => GetCatalogInfoOnConfigResult;
export type ListCatalogInfoOnConfig = () => ListCatalogInfoOnConfigResult;

export type CatalogInfoOnConfigProvider = {
  get: GetCatalogInfoOnConfig;
  list: ListCatalogInfoOnConfig;
};

export type GetCatalogConfigResult = ResultAsync<Option<CatalogConfig>, ConfigError>;
export type GetCatalogConfig = (id: string) => GetCatalogConfigResult;

export type CatalogConfigProvider = {
  get: GetCatalogConfig;
};

export type RegisterCatalogConfigResult = ResultAsync<void, ConfigError>;
export type RegisterCatalogConfig = (catalogConfig: CatalogConfig) => RegisterCatalogConfigResult;

export type RegisterCatalogConfigProvider = {
  register: RegisterCatalogConfig;
};
