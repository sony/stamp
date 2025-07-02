import { z } from "zod";
import { ResourceHandlers } from "../catalogInterface/handler/resource";
import { CatalogId } from "./id";

export const ResourceTypeId = z.string().min(1).max(128);
export type ResourceTypeId = z.infer<typeof ResourceTypeId>;

export const ResourceCreateParam = z.object({
  type: z.enum(["string", "number", "boolean", "string[]"]),
  id: z.string().max(128),
  name: z.string().max(128),
  required: z.boolean(),
});
export type ResourceCreateParam = z.infer<typeof ResourceCreateParam>;

export const ResourceInfoParam = z.object({
  type: z.enum(["string", "number", "boolean", "string[]"]),
  id: z.string().max(128),
  name: z.string().max(128),
  edit: z.boolean(),
});
export type ResourceInfoParam = z.infer<typeof ResourceInfoParam>;

const UpdateApprover = z.object({ approverType: z.literal("parentResource") });

export const ResourceTypeConfig = z.object({
  id: ResourceTypeId,
  name: z.string().max(128),
  description: z.string().max(256),
  createParams: z.array(ResourceCreateParam).max(10),
  infoParams: z.array(ResourceInfoParam).max(10),
  handlers: z.any().transform((v) => v as ResourceHandlers),
  parentResourceTypeId: z.string().optional(),
  isCreatable: z.boolean(),
  isUpdatable: z.boolean(),
  isDeletable: z.boolean(),
  ownerManagement: z.boolean(),
  approverManagement: z.boolean(),
  anyoneCanCreate: z.boolean().optional(),
  updateApprover: UpdateApprover.optional(),
});

export type ResourceTypeConfig = z.output<typeof ResourceTypeConfig>;

export const ResourceTypeInfo = ResourceTypeConfig.omit({ handlers: true }).merge(z.object({ catalogId: CatalogId }));
export type ResourceTypeInfo = z.infer<typeof ResourceTypeInfo>;
