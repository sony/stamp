import { z } from "zod";

export const ApprovalFlowRequestInput = z.object({
  permissionId: z.string().refine((value) => value !== "", "permissionId cannot be empty"),
  userName: z.string().refine((value) => value !== "", "userName cannot be empty"),
});
export type ApprovalFlowRequestInput = z.infer<typeof ApprovalFlowRequestInput>;
