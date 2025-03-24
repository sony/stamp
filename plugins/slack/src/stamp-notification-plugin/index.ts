import { LogLevel } from "@stamp-lib/stamp-logger";
import { NotificationPluginConfig } from "@stamp-lib/stamp-types/pluginInterface/notification";
import { sendChannelMessage, setChannel, unsetChannel } from "./channel";
import { sendApprovalRequestNotification, sendGroupMemberAddedEvent, sendNotification, sendResourceAudit } from "./notification";
import { StampHubRouterClient } from "@stamp-lib/stamp-hub";

export const createStampNotificationPlugin = (input: {
  slackBotToken: string;
  logLevel: LogLevel;
  stampHubRouterClient: StampHubRouterClient;
  pluginId: string;
  pluginName: string;
}): NotificationPluginConfig => {
  const { slackBotToken, logLevel, stampHubRouterClient, pluginId, pluginName } = input;
  const pluginDescription = `Notification plugin for ${pluginName}`;
  const notificationPluginConfig: NotificationPluginConfig = {
    id: pluginId,
    name: pluginName,
    description: pluginDescription,
    handlers: {
      setChannel: setChannel(logLevel, sendChannelMessage({ slackBotToken })),
      unsetChannel: unsetChannel(logLevel, sendChannelMessage({ slackBotToken })),
      sendNotification: sendNotification({
        logLevel,
        sendResourceAudit: sendResourceAudit({ slackBotToken }),
        sendGroupMemberAddedEvent: sendGroupMemberAddedEvent({ slackBotToken }),
        sendApprovalRequestNotification: sendApprovalRequestNotification({
          slackBotToken,
          getStampHubUserClient: stampHubRouterClient["systemRequest"]["user"]["get"],
        }),
      }),
    },
    channelConfigProperties: [
      { id: "channelId", name: "Channel ID", description: "Channel ID to send notification", type: "string", required: true },
      { id: "customMessage", name: "Custom message", description: "Message to send with notification", type: "string", required: false },
    ],
  };

  return notificationPluginConfig;
};
