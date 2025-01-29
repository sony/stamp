import { NotificationPluginConfig } from "../pluginInterface/notification";
import { ResultAsync } from "neverthrow";
import { ConfigError } from "./error";
import { Option } from "@stamp-lib/stamp-option";

export type GetNotificationPluginConfigResult = ResultAsync<Option<NotificationPluginConfig>, ConfigError>;
export type ListNotificationPluginConfigResult = ResultAsync<Array<NotificationPluginConfig>, ConfigError>;

export type GetNotificationPluginConfig = (id: string) => GetNotificationPluginConfigResult;
export type ListNotificationPluginConfig = () => ListNotificationPluginConfigResult;

export type NotificationPluginConfigProvider = {
  get: GetNotificationPluginConfig;
  list: ListNotificationPluginConfig;
};
