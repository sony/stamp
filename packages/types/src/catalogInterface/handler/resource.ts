import { Result } from "neverthrow";
import { HandlerError } from "./error";
import { z } from "zod";
import { ResourceAuditItem, ResourceId, ResourceParams, ResourceName } from "../../models/resource";
import { ResourceTypeId } from "../../models/resourceType";
import { Option } from "@stamp-lib/stamp-option";
export const ResourceOutput = z.object({
  resourceId: ResourceId,
  name: ResourceName,
  params: ResourceParams,
  parentResourceId: ResourceId.optional(),
});

export const CreateResourceInput = z.object({
  resourceTypeId: ResourceTypeId,
  inputParams: ResourceParams,
  parentResourceId: ResourceId.optional(),
});

export const DeleteResourceInput = z.object({
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
});

export const GetResourceInput = z.object({
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
});

export const UpdateResourceInput = z.object({
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
  updateParams: ResourceParams,
});

export const ListResourcesInput = z.object({
  resourceTypeId: ResourceTypeId,
  parentResourceId: z.string().optional(), // If specified, returns list that is a child of this parent resource.
  prefix: z.object({ type: z.enum(["name"]), value: z.string() }).optional(), // If specified, returns list that satisfies this prefix condition.
  paginationToken: z.string().optional(), // If specified, returns list using pagination token.
});

export const ListResourcesOutput = z.object({
  resources: z.array(ResourceOutput),
  paginationToken: z.string().optional(),
});

export const ListResourceAuditItemInput = z.object({
  resourceTypeId: ResourceTypeId,
  resourceId: ResourceId,
  paginationToken: z.string().optional(), // If specified, returns list using pagination token.
  limit: z.number().int().min(1).max(100).optional(),
});

export const ListResourceAuditItemOutput = z.object({
  auditItems: z.array(ResourceAuditItem),
  paginationToken: z.string().optional(),
});

export type ResourceOutput = z.infer<typeof ResourceOutput>;
export type CreateResourceInput = z.infer<typeof CreateResourceInput>;
export type DeleteResourceInput = z.infer<typeof DeleteResourceInput>;
export type GetResourceInput = z.infer<typeof GetResourceInput>;
export type UpdateResourceInput = z.infer<typeof UpdateResourceInput>;
export type ListResourcesInput = z.infer<typeof ListResourcesInput>;
export type ListResourcesOutput = z.infer<typeof ListResourcesOutput>;
export type ListResourceAuditItemInput = z.infer<typeof ListResourceAuditItemInput>;
export type ListResourceAuditItemOutput = z.infer<typeof ListResourceAuditItemOutput>;

export type CreateResource = (input: CreateResourceInput) => Promise<Result<ResourceOutput, HandlerError>>;
export type DeleteResource = (input: DeleteResourceInput) => Promise<Result<void, HandlerError>>;
export type GetResource = (input: GetResourceInput) => Promise<Result<Option<ResourceOutput>, HandlerError>>;
export type UpdateResource = (input: UpdateResourceInput) => Promise<Result<ResourceOutput, HandlerError>>;
export type ListResources = (input: ListResourcesInput) => Promise<Result<ListResourcesOutput, HandlerError>>;
export type ListResourceAuditItem = (input: ListResourceAuditItemInput) => Promise<Result<ListResourceAuditItemOutput, HandlerError>>;

export type ResourceHandlers = {
  createResource: CreateResource;
  deleteResource: DeleteResource;
  getResource: GetResource;
  updateResource: UpdateResource;
  listResources: ListResources;
  listResourceAuditItem: ListResourceAuditItem;
};
