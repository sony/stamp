import { z } from "zod";

export const ValidatedAwsAccountInput = z.object({
  accountId: z.string().refine((value) => !isNaN(Number(value)) && value.length === 12, {
    message: "accountId must be a 12-digit number",
  }),
});
export type ValidatedAwsAccountInput = z.infer<typeof ValidatedAwsAccountInput>;

export const ValidateAwsAccountInputWithName = ValidatedAwsAccountInput.extend({
  name: z.string().refine((value) => value !== "", "name cannot be empty"),
});
export type ValidateAwsAccountInputWithName = z.infer<typeof ValidateAwsAccountInputWithName>;

export interface AwsAccount {
  accountId: string;
  name: string;
}
