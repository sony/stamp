import { z } from "zod";

export const ChannelConfigProperties = z.object({
  channelId: z.string(),
  customMessage: z.string().max(1024).optional(),
});

export type ChannelConfigProperties = z.infer<typeof ChannelConfigProperties>;
