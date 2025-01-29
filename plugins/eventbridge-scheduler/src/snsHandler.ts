import { createStampHubHTTPServerClient } from "@stamp-lib/stamp-hub";
import { createLogger, LogLevel } from "@stamp-lib/stamp-logger";
import { SchedulerEvent } from "@stamp-lib/stamp-types/models";
import { Hono } from "hono";
import MessageValidator from "sns-validator";
import { z } from "zod";

export const SNSEventBridgeSchedulerConfig = z.object({
  stampHubUrl: z.string(),
  topicArn: z.string(),
});
export type SNSEventBridgeSchedulerConfig = z.infer<typeof SNSEventBridgeSchedulerConfig>;

export const createSNSEventBridgeSchedulerHandler = (snsEventBridgeSchedulerConfig: SNSEventBridgeSchedulerConfig) => {
  const { stampHubUrl, topicArn } = SNSEventBridgeSchedulerConfig.parse(snsEventBridgeSchedulerConfig);
  const router = new Hono();
  router.all("/sns-endpoint/*", async (c) => {
    const body = await c.req.json();
    const validator = new MessageValidator();
    const logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "INFO";

    const event: Record<string, unknown> = await new Promise((resolve, reject) => {
      validator.validate(body, (err, message) => {
        const logger = createLogger(logLevel, { moduleName: "EventBridge-scheduler" });
        if (err) {
          logger.error("Failed to validate message", err);
          reject(err);
        } else {
          if (!message) {
            logger.error("Failed to validate message. Message is empty");
            reject(new Error("Failed to validate message"));
            return;
          }
          logger.info("Message validated", message);
          resolve(message);
        }
      });
    });
    const requestContext = {
      messageId: event.MessageId,
      topicArn: event.TopicArn,
    };

    const logger = createLogger(logLevel, { moduleName: "EventBridge-scheduler", requestContext: JSON.stringify(requestContext) });
    logger.info("Received event", event);

    // Handle SubscriptionConfirmation event
    if (event.Type === "SubscriptionConfirmation") {
      if (event.TopicArn !== topicArn) {
        logger.warn("Received SubscriptionConfirmation event with incorrect topicArn", event);
        return;
      }
      logger.info("Received SubscriptionConfirmation event", event);
      const subscribeURL = event.SubscribeURL as string;
      await fetch(subscribeURL);
      return;
    } else if (event.Type === "Notification") {
      logger.info("Received Notification event", event);
      const schedulerEvent = SchedulerEvent.parse(JSON.parse(event.Message as string));
      const client = createStampHubHTTPServerClient(stampHubUrl);
      return await client.systemRequest.schedulerHandler.invoke.mutate({ schedulerEvent });
    }

    logger.warn("Received unknown event", event);
    return;
  });

  return router;
};
