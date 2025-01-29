import { z } from "zod";

export const AwsAccount = z.object({
  accountId: z.string().regex(/^[0-9]{12}$/),
  name: z.string().max(128),
});
export type AwsAccount = z.infer<typeof AwsAccount>;
