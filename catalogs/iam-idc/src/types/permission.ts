import { z } from "zod";

export const PrepareRegisterPermissionInput = z.object({
  name: z
    .string()
    .max(128, "permission name cannot be longer than 128 characters")
    .refine((value) => value !== "", "name cannot be empty"),
  description: z
    .string()
    .max(1024, "permission description cannot be longer than 128 characters")
    .refine((value) => value !== "", "description cannot be empty"),
  awsAccountId: z.string().refine((value) => value !== "", "awsAccountId cannot be empty"),
  permissionSetNameId: z
    .string()
    .max(16, "permission Set Name Id cannot be longer than 16 characters")
    .refine((value) => value !== "", "permission Set Name Id cannot be empty"),
  managedIamPolicyNames: z
    .array(z.string().refine((value) => value !== "", "managedIamPolicyName cannot be empty"))
    .max(10, "managedIamPolicyNames cannot be more than 10"),
  customIamPolicyNames: z
    .array(z.string().refine((value) => value !== "", "customIamPolicyName cannot be empty"))
    .max(10, "customIamPolicyNames cannot be more than 10"),
  sessionDuration: z.string().refine((value) => value !== "", "sessionDuration cannot be empty"), // TODO: using regex to validate sessionDuration
});
export type PrepareRegisterPermissionInput = z.infer<typeof PrepareRegisterPermissionInput>;

export const PrepareRegisterPermissionOutput = PrepareRegisterPermissionInput.merge(
  z.object({
    permissionId: z.string(),
  })
);
export type PrepareRegisterPermissionOutput = z.infer<typeof PrepareRegisterPermissionOutput>;

export const RegisterPermissionInput = PrepareRegisterPermissionOutput.merge(
  z.object({
    groupId: z.string(),
    permissionSetArn: z.string(),
  })
);
export type RegisterPermissionInput = z.infer<typeof RegisterPermissionInput>;

export const PermissionInfo = RegisterPermissionInput.merge(
  z.object({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
);
export type PermissionInfo = z.infer<typeof PermissionInfo>;

export const ListPermissionInfoResult = z.object({
  items: z.array(PermissionInfo),
  nextToken: z.string().optional(),
});
export type ListPermissionInfoResult = z.infer<typeof ListPermissionInfoResult>;
