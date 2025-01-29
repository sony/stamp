import { UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { z } from "zod";

export const DeleteUserInput = z.object({
  userId: UserId,
  requestUserId: UserId,
});
export type DeleteUserInput = z.infer<typeof DeleteUserInput>;
