import { z } from "zod";

// Property definition to set on NotificationChannel
export const NotificationChannelConfigProperty = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(128),
  description: z.string().max(512),
  type: z.enum(["string", "number", "boolean"]),
  required: z.boolean(),
});
export type NotificationChannelConfigProperty = z.infer<typeof NotificationChannelConfigProperty>;

export const NotificationChannelConfigProperties = z.array(NotificationChannelConfigProperty).max(10);
export type NotificationChannelConfigProperties = z.infer<typeof NotificationChannelConfigProperties>;

export const NotificationChannel = z.object({
  typeId: z.string(),
  id: z.string(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});
export type NotificationChannel = z.infer<typeof NotificationChannel>;
