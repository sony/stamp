import { LogLevel, createLogger } from "@stamp-lib/stamp-logger";
import { createStampHubHTTPServerClient } from "@stamp-lib/stamp-hub";
import { Hono, HonoRequest } from "hono";

import { SlackApp } from "slack-edge";
import { SlackPluginConfig, SlackPluginConfigInput } from "./config";
import { createAccountLinkRouter } from "./stamp-front-plugin-handler/accountLink";

import { approveButtonActionLazyHandler } from "./slack-app-handler/action/approveButton";
import { rejectButtonActionLazyHandler } from "./slack-app-handler/action/rejectButton";
import { getAccountLink } from "./stamp-hub/accountLink";
import { getRequestInfo } from "./stamp-hub/approvalRequest";
import { approveRequest, rejectRequest } from "./stamp-hub/approvalRequest";

import { createStampNotificationPlugin } from "./stamp-notification-plugin";
import { NotificationPluginConfig } from "@stamp-lib/stamp-types/pluginInterface/notification";

function convertLogLevelToSlackLoggingLevel(logLevel: LogLevel): "ERROR" | "WARN" | "INFO" | "DEBUG" {
  switch (logLevel) {
    case "DEBUG":
      return "DEBUG";
    case "INFO":
      return "INFO";
    case "WARN":
      return "WARN";
    case "ERROR":
    case "FATAL":
      return "ERROR";
    default:
      return "ERROR";
  }
}

export function createSlackPlugin(config: SlackPluginConfigInput) {
  const parsedConfig = SlackPluginConfig.parse(config);
  const logger = createLogger(parsedConfig.logLevel, { moduleName: "slack" });
  const slackEventPath = parsedConfig.basePath + "/event";
  const pluginId = parsedConfig.workSpaceId ? `slack-${parsedConfig.workSpaceId}` : "slack";
  const pluginName = parsedConfig.workSpaceName ? `Slack (${parsedConfig.workSpaceName})` : "Slack";
  const slackApp = new SlackApp({
    env: {
      SLACK_SIGNING_SECRET: parsedConfig.slackSigningSecret,
      SLACK_BOT_TOKEN: parsedConfig.slackBotToken,
      SLACK_VERIFICATION_TOKEN: parsedConfig.slackVerificationToken,
      SLACK_LOGGING_LEVEL: convertLogLevelToSlackLoggingLevel(parsedConfig.logLevel),
    },
    routes: {
      events: slackEventPath,
    },
  });
  const stampHubClient = createStampHubHTTPServerClient(parsedConfig.stampHubUrl);
  const getAccountLinkWithLogger = getAccountLink(logger, stampHubClient.systemRequest.accountLink.get, pluginId);
  const getRequestInfoWithLogger = getRequestInfo(logger, stampHubClient.userRequest.approvalRequest.get);

  slackApp.event("message", async (req) => {
    logger.info("message event");
    logger.info(JSON.stringify(req.payload));
  });
  slackApp.action(
    "approve_button",
    async () => {
      //only ack
    },
    approveButtonActionLazyHandler(
      logger,
      getAccountLinkWithLogger,
      getRequestInfoWithLogger,
      approveRequest(logger, stampHubClient.userRequest.approvalRequest.approve)
    )
  );

  slackApp.action(
    "reject_button",
    async () => {
      //only ack
    },
    rejectButtonActionLazyHandler(
      logger,
      getAccountLinkWithLogger,
      getRequestInfoWithLogger,
      rejectRequest(logger, stampHubClient.userRequest.approvalRequest.reject)
    )
  );

  const slackAppHandler = async (req: HonoRequest) => {
    const rawReq = req.raw;
    // logger.info("slackAppHandler", rawReq);
    return await slackApp.run(rawReq);
  };

  const accountLinkRouter = createAccountLinkRouter(logger, parsedConfig, pluginId);

  const router = new Hono();
  router.all("/event/*", (c) => {
    return slackAppHandler(c.req);
  });
  router.route("/account-link", accountLinkRouter);

  const notificationPluginConfig: NotificationPluginConfig = createStampNotificationPlugin({
    slackBotToken: parsedConfig.slackBotToken,
    logLevel: parsedConfig.logLevel,
    stampHubRouterClient: stampHubClient,
    pluginId: pluginId,
    pluginName: pluginName,
  });

  return { router, notificationPluginConfig };
}

export * from "./stamp-notification-plugin";
