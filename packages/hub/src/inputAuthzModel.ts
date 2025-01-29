import { z } from "zod";
import { DeleteUserInput } from "./workflows/user/userRequest/input";
import {
  AddUserToGroupInput,
  RemoveUserFromGroupInput,
  DeleteGroupInput,
  GetGroupInput,
  ListGroupMemberShipByGroupInput,
  UpdateGroupInput,
  CreateGroupInput as WorkflowCreateGroupInput,
} from "./workflows/group/input";
import {
  CreateResourceInput as WorkflowCreateResourceInput,
  DeleteResourceInput,
  UpdateResourceApproverInput as WorkflowUpdateResourceApproverInput,
  UpdateResourceOwnerInput as WorkflowUpdateResourceOwnerInput,
  CreateAuditNotificationInput,
  DeleteAuditNotificationInput,
} from "./workflows/resource/input";
import { UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ApprovalFlowInfo } from "@stamp-lib/stamp-types/models";

export const EditUserInput = DeleteUserInput;
export type EditUserInput = z.infer<typeof EditUserInput>;

export const EditGroupInput = z.union([AddUserToGroupInput, RemoveUserFromGroupInput, DeleteGroupInput, UpdateGroupInput]);
export type EditGroupInput = z.infer<typeof EditGroupInput>;

export const ReadGroupInput = z.union([GetGroupInput, ListGroupMemberShipByGroupInput]);
export type ReadGroupInput = z.infer<typeof ReadGroupInput>;

export const CreateGroupInput = WorkflowCreateGroupInput;
export type CreateGroupInput = z.infer<typeof CreateGroupInput>;

export const CreateResourceInput = WorkflowCreateResourceInput;
export type CreateResourceInput = z.infer<typeof CreateResourceInput>;

export const EditResourceInput = z.union([DeleteResourceInput, CreateAuditNotificationInput, DeleteAuditNotificationInput]);
export type EditResourceInput = z.infer<typeof EditResourceInput>;

export const UpdateResourceApproverInput = WorkflowUpdateResourceApproverInput;
export type UpdateResourceApproverInput = z.infer<typeof UpdateResourceApproverInput>;

export const UpdateResourceOwnerInput = WorkflowUpdateResourceOwnerInput;
export type UpdateResourceOwnerInput = z.infer<typeof UpdateResourceOwnerInput>;

export const EditApprovalFlowInput = z.object({ catalogId: z.string(), approvalFlowId: z.string(), requestUserId: UserId });
export type EditApprovalFlowInput = z.infer<typeof EditApprovalFlowInput>;

export const SubmitApprovalRequestInput = z.object({ catalogId: z.string(), approvalFlowId: z.string(), requestUserId: UserId });
export type SubmitApprovalRequestInput = z.infer<typeof SubmitApprovalRequestInput>;

export const ApproveApprovalRequestInput = z.object({ catalogId: z.string(), approvalFlowId: z.string(), userIdWhoApproved: UserId });
export type ApproveApprovalRequestInput = z.infer<typeof ApproveApprovalRequestInput>;

export const RejectApprovalRequestInput = z.object({ catalogId: z.string(), approvalFlowId: z.string(), userIdWhoRejected: UserId });
export type RejectApprovalRequestInput = z.infer<typeof RejectApprovalRequestInput>;

export const RevokeApprovalRequestInput = z.object({
  catalogId: z.string(),
  approvalFlowId: z.string(),
  approvalFlowInfo: ApprovalFlowInfo,
  requestUserId: UserId,
  userIdWhoRevoked: UserId,
});
export type RevokeApprovalRequestInput = z.infer<typeof RevokeApprovalRequestInput>;
