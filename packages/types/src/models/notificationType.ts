import { z } from "zod";
import { NotificationChannelConfigProperties } from "./notificationChannel";

export const NotificationType = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(128),
  description: z.string().max(512),
  channelConfigProperties: NotificationChannelConfigProperties,
});
export type NotificationType = z.infer<typeof NotificationType>;
