import { NotificationPluginConfig } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { okAsync } from "neverthrow";
import {
  GetNotificationPluginConfigResult,
  ListNotificationPluginConfigResult,
  NotificationPluginConfigProvider,
} from "@stamp-lib/stamp-types/configInterface";
import { some, none } from "@stamp-lib/stamp-option";

const getNotificationPluginConfig =
  (notificationPluginConfigMap: ReadonlyMap<string, Readonly<NotificationPluginConfig>>) =>
  (id: string): GetNotificationPluginConfigResult => {
    const config = notificationPluginConfigMap.get(id);
    if (config === undefined) {
      return okAsync(none);
    } else {
      return okAsync(some(config));
    }
  };

const listNotificationPluginConfig =
  (notificationPluginConfigMap: ReadonlyMap<string, Readonly<NotificationPluginConfig>>) => (): ListNotificationPluginConfigResult => {
    return okAsync(Array.from(notificationPluginConfigMap.values()));
  };

export function createNotificationPluginConfigProvider(
  notificationPluginConfigMap: ReadonlyMap<string, Readonly<NotificationPluginConfig>>
): NotificationPluginConfigProvider {
  return {
    get: getNotificationPluginConfig(notificationPluginConfigMap),
    list: listNotificationPluginConfig(notificationPluginConfigMap),
  };
}
