import { CreatePolicyCommand, DeletePolicyCommand, IAMClient, ListEntitiesForPolicyCommand, NoSuchEntityException } from "@aws-sdk/client-iam";
import { Logger } from "@stamp-lib/stamp-logger";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { z } from "zod";
import { generatePolicyName } from "./policyName";

export const CreateAssumeRolePolicyCommand = z.object({
  prefixPolicyName: z.string().refine((value) => value !== "", "prefixPolicyName cannot be empty"),
  targetRoleName: z.string().refine((value) => value !== "", "targetRoleName cannot be empty"),
  targetAWSAccountId: z.string().refine((value) => value !== "", "targetAWSAccountId cannot be empty"),
});
export type CreateAssumeRolePolicyCommand = z.infer<typeof CreateAssumeRolePolicyCommand>;
export const CreateAssumeRolePolicyOutput = z.object({
  assumeRolePolicyArn: z.string(),
});
export type CreateAssumeRolePolicyOutput = z.infer<typeof CreateAssumeRolePolicyOutput>;
export type CreateAssumeRolePolicy = (input: CreateAssumeRolePolicyCommand) => ResultAsync<CreateAssumeRolePolicyOutput, HandlerError>;

export const createAssumeRolePolicy =
  (logger: Logger, iamClient: IAMClient): CreateAssumeRolePolicy =>
  (input) => {
    const parsedResult = CreateAssumeRolePolicyCommand.safeParse(input);
    if (!parsedResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${parsedResult.error}`, "INTERNAL_SERVER_ERROR"));
    }
    const parsedInput = parsedResult.data;
    const policyName = generatePolicyName(parsedInput.prefixPolicyName, parsedInput.targetAWSAccountId, parsedInput.targetRoleName);

    const createPolicy = new CreatePolicyCommand({
      PolicyName: policyName,
      PolicyDocument: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "",
            Effect: "Allow",
            Resource: `arn:aws:iam::${parsedInput.targetAWSAccountId}:role/${parsedInput.targetRoleName}`,
            Action: ["sts:AssumeRole", "sts:TagSession"],
          },
        ],
      }),
    });

    return ResultAsync.fromPromise(iamClient.send(createPolicy), (error) => {
      const errorMessage = `Failed to create policy: ${error}`;
      logger.error(errorMessage);
      return new HandlerError(errorMessage, "INTERNAL_SERVER_ERROR");
    }).andThen((createPolicyResult) => {
      if (!createPolicyResult.Policy?.Arn) {
        return errAsync(new HandlerError(`Failed to create policy. Policy arn is not set.: ${createPolicyResult}`, "INTERNAL_SERVER_ERROR"));
      }
      return okAsync({ assumeRolePolicyArn: createPolicyResult.Policy?.Arn });
    });
  };

export const DeleteAssumeRolePolicyCommand = z.object({
  assumeRolePolicyArn: z.string(),
});
export type DeleteAssumeRolePolicyCommand = z.infer<typeof DeleteAssumeRolePolicyCommand>;
export type DeleteAssumeRolePolicy = (input: DeleteAssumeRolePolicyCommand) => ResultAsync<void, HandlerError>;

export const deleteAssumeRolePolicy =
  (logger: Logger, iamClient: IAMClient): DeleteAssumeRolePolicy =>
  (input) => {
    const parsedResult = DeleteAssumeRolePolicyCommand.safeParse(input);
    if (!parsedResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${parsedResult.error}`, "INTERNAL_SERVER_ERROR"));
    }
    const parsedInput = parsedResult.data;

    const deletePolicy = new DeletePolicyCommand({
      PolicyArn: parsedInput.assumeRolePolicyArn,
    });

    return ResultAsync.fromPromise(iamClient.send(deletePolicy), (error) => {
      const errorMessage = `Failed to delete policy: ${error}`;
      logger.error(errorMessage);
      return new HandlerError(errorMessage, "INTERNAL_SERVER_ERROR");
    }).map(() => {});
  };

export const ListIamRoleAttachedAssumeRolePolicyCommand = z.object({
  assumeRolePolicyArn: z.string(),
  nextToken: z.string().optional(),
  maxItems: z.number().optional(),
});
export type ListIamRoleAttachedAssumeRolePolicyCommand = z.infer<typeof ListIamRoleAttachedAssumeRolePolicyCommand>;

export const ListIamRoleAttachedAssumeRolePolicyOutput = z.object({
  roleNames: z.array(z.string()),
  nextToken: z.string().optional(),
});
export type ListIamRoleAttachedAssumeRolePolicyOutput = z.infer<typeof ListIamRoleAttachedAssumeRolePolicyOutput>;

export type ListIamRoleAttachedAssumeRolePolicy = (
  input: ListIamRoleAttachedAssumeRolePolicyCommand
) => ResultAsync<ListIamRoleAttachedAssumeRolePolicyOutput, HandlerError>;

export const listIamRoleAttachedAssumeRolePolicy =
  (logger: Logger, iamClient: IAMClient): ListIamRoleAttachedAssumeRolePolicy =>
  (input) => {
    const parsedResult = ListIamRoleAttachedAssumeRolePolicyCommand.safeParse(input);
    if (!parsedResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${parsedResult.error}`, "INTERNAL_SERVER_ERROR"));
    }
    const parsedInput = parsedResult.data;

    const listEntitiesForPolicyCommand = new ListEntitiesForPolicyCommand({
      EntityFilter: "Role",
      PolicyArn: parsedInput.assumeRolePolicyArn,
      PolicyUsageFilter: "PermissionsPolicy",
      Marker: parsedInput.nextToken,
      MaxItems: parsedInput.maxItems,
    });

    return ResultAsync.fromPromise(iamClient.send(listEntitiesForPolicyCommand), (error) => error)
      .map((result) => {
        logger.info(result);
        // RoleName is required, but it is not set in the type definition.
        const roleNames = result.PolicyRoles?.map((role) => role.RoleName ?? "") ?? [];
        const nextToken = result.Marker;
        return { roleNames, nextToken };
      })
      .orElse((error) => {
        // If the policy does not exist, it is not an error for idempotent
        // Error message when policy does not exist at 2024/01 is " Policy <Policy ARN> does not exist or is not attachable.". This may change in the future.
        if (error instanceof NoSuchEntityException && error.message.includes("Policy")) {
          return okAsync({ roleNames: [], nextToken: undefined });
        }
        const errorMessage = `Failed to list attached role policies: ${error}`;
        logger.error(errorMessage);
        return errAsync(new HandlerError(errorMessage, "INTERNAL_SERVER_ERROR"));
      });
  };
