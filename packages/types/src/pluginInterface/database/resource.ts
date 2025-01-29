import { Option } from "@stamp-lib/stamp-option";
import { ResultAsync } from "neverthrow";
import { z } from "zod";
import { AuditNotification, CatalogId, ResourceId, ResourceOnDB, ResourceTypeId } from "../../models";
import { DBError } from "./error";

export type ResourceDBGetByIdResult = ResultAsync<Option<ResourceOnDB>, DBError>;
export type ResourceDBSetResult = ResultAsync<ResourceOnDB, DBError>;
export type ResourceDBDeleteResult = ResultAsync<void, DBError>;

export const ResourceInput = z.object({
  id: ResourceId,
  catalogId: CatalogId,
  resourceTypeId: ResourceTypeId,
});
export type ResourceInput = z.infer<typeof ResourceInput>;

export const CreateAuditNotificationInput = AuditNotification.omit({ id: true }).merge(ResourceInput);
export type CreateAuditNotificationInput = z.infer<typeof CreateAuditNotificationInput>;
export type CreateAuditNotificationOutput = ResultAsync<ResourceOnDB, DBError>;
export type CreateAuditNotification = (input: CreateAuditNotificationInput) => CreateAuditNotificationOutput;

export const UpdateAuditNotificationInput = AuditNotification.omit({ id: true })
  .merge(ResourceInput)
  .merge(z.object({ auditNotificationId: z.string().uuid() }));
export type UpdateAuditNotificationInput = z.infer<typeof UpdateAuditNotificationInput>;
export type UpdateAuditNotificationOutput = ResultAsync<ResourceOnDB, DBError>;
export type UpdateAuditNotification = (input: UpdateAuditNotificationInput) => UpdateAuditNotificationOutput;

export const DeleteAuditNotificationInput = ResourceInput.merge(z.object({ auditNotificationId: z.string().uuid() }));
export type DeleteAuditNotificationInput = z.infer<typeof DeleteAuditNotificationInput>;
export type DeleteAuditNotificationOutput = ResultAsync<ResourceOnDB, DBError>;
export type DeleteAuditNotification = (input: DeleteAuditNotificationInput) => DeleteAuditNotificationOutput;

export type ResourceDBProvider = {
  getById(input: ResourceInput): ResourceDBGetByIdResult;
  set(resourceOnDB: ResourceOnDB): ResourceDBSetResult;
  delete(input: ResourceInput): ResourceDBDeleteResult;
  createAuditNotification: CreateAuditNotification;
  updateAuditNotification: UpdateAuditNotification;
  deleteAuditNotification: DeleteAuditNotification;
};
