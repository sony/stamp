import { AttachRolePolicyCommand, IAMClient, DetachRolePolicyCommand, NoSuchEntityException, ListAttachedRolePoliciesCommand } from "@aws-sdk/client-iam";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { z } from "zod";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { Logger } from "@stamp-lib/stamp-logger";

export const PromoteIamRoleCommand = z.object({
  sourceRoleName: z.string(),
  assumeRolePolicyArn: z.string(),
});
export type PromoteIamRoleCommand = z.infer<typeof PromoteIamRoleCommand>;
export type PromoteIamRole = (input: PromoteIamRoleCommand) => ResultAsync<void, HandlerError>;

export const promoteIamRole =
  (logger: Logger, iamClient: IAMClient): PromoteIamRole =>
  (input) => {
    const parsedResult = PromoteIamRoleCommand.safeParse(input);
    if (!parsedResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${parsedResult.error}`, "INTERNAL_SERVER_ERROR"));
    }
    const parsedInput = parsedResult.data;

    const attachRolePolicyCommand = new AttachRolePolicyCommand({
      RoleName: parsedInput.sourceRoleName,
      PolicyArn: parsedInput.assumeRolePolicyArn,
    });

    return ResultAsync.fromPromise(iamClient.send(attachRolePolicyCommand), (error) => {
      const errorMessage = `Failed to put role policy: ${error}`;
      logger.error(errorMessage);
      return new HandlerError(errorMessage, "INTERNAL_SERVER_ERROR");
    }).map(() => {});
  };

export const DemoteIamRoleCommand = z.object({
  sourceRoleName: z.string(),
  assumeRolePolicyArn: z.string(),
});
export type DemoteIamRoleCommand = z.infer<typeof DemoteIamRoleCommand>;

export type DemoteIamRole = (input: DemoteIamRoleCommand) => ResultAsync<void, HandlerError>;

export const demoteIamRole =
  (logger: Logger, iamClient: IAMClient): DemoteIamRole =>
  (input) => {
    const parsedResult = DemoteIamRoleCommand.safeParse(input);
    if (!parsedResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${parsedResult.error}`, "INTERNAL_SERVER_ERROR"));
    }
    const parsedInput = parsedResult.data;
    const detachRolePolicyCommand = new DetachRolePolicyCommand({
      RoleName: parsedInput.sourceRoleName,
      PolicyArn: parsedInput.assumeRolePolicyArn,
    });

    return ResultAsync.fromPromise(iamClient.send(detachRolePolicyCommand), (error) => error)
      .map(() => {})
      .orElse((error) => {
        // If the policy does not exist, it is not an error for idempotent.
        // Error message when policy does not exist at 2024/01 is "Policy <Policy name> was not found.". This may change in the future.
        if (error instanceof NoSuchEntityException && error.message.includes("Policy")) {
          return okAsync(void 0);
        }
        const errorMessage = `Failed to delete role policy: ${error}`;
        logger.error(errorMessage);
        return errAsync(new HandlerError(errorMessage, "INTERNAL_SERVER_ERROR"));
      });
  };

export const ListIamRoleAttachedPolicyArnsCommand = z.object({
  iamRoleName: z.string(),
  nextToken: z.string().optional(),
  maxItems: z.number().optional(),
});
export type ListIamRoleAttachedPolicyArnsCommand = z.infer<typeof ListIamRoleAttachedPolicyArnsCommand>;

export const ListIamRoleAttachedPolicyArnsOutput = z.object({
  attachedPolicyArns: z.array(z.string()),
  nextToken: z.string().optional(),
});
export type ListIamRoleAttachedPolicyArnsOutput = z.infer<typeof ListIamRoleAttachedPolicyArnsOutput>;

export type ListIamRoleAttachedPolicyArns = (input: ListIamRoleAttachedPolicyArnsCommand) => ResultAsync<ListIamRoleAttachedPolicyArnsOutput, HandlerError>;
export const listIamRoleAttachedPolicyArns =
  (logger: Logger, iamClient: IAMClient): ListIamRoleAttachedPolicyArns =>
  (input) => {
    const parsedResult = ListIamRoleAttachedPolicyArnsCommand.safeParse(input);
    if (!parsedResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${parsedResult.error}`, "INTERNAL_SERVER_ERROR"));
    }
    const parsedInput = parsedResult.data;

    const listAttachedRolePoliciesCommand = new ListAttachedRolePoliciesCommand({
      RoleName: parsedInput.iamRoleName,
      Marker: parsedInput.nextToken,
      MaxItems: parsedInput.maxItems,
    });

    return ResultAsync.fromPromise(iamClient.send(listAttachedRolePoliciesCommand), (error) => {
      const errorMessage = `Failed to list attached role policies: ${error}`;
      logger.error(errorMessage);
      return new HandlerError(errorMessage, "INTERNAL_SERVER_ERROR");
    }).map((result) => {
      const attachedPolicyArns = result.AttachedPolicies ? result.AttachedPolicies.map((role) => role.PolicyArn ?? "") : [];
      const nextToken = result.Marker;
      return { attachedPolicyArns, nextToken };
    });
  };

type FetchAllAttachedRolePolicyArnsInput = { iamRoleName: string; nextToken?: string };
type FetchAllAttachedRolePolicyArnsOutput = { attachedPolicyArns: string[]; nextToken?: string };
type FetchAllAttachedRolePolicyArns = <T extends FetchAllAttachedRolePolicyArnsInput>(
  input: T
) => ResultAsync<FetchAllAttachedRolePolicyArnsOutput, HandlerError>;
export const fetchAllAttachedRolePolicyArns =
  (listAttachedRolePoliciesFunc: ListIamRoleAttachedPolicyArns): FetchAllAttachedRolePolicyArns =>
  (input) => {
    return listAttachedRolePoliciesFunc({ iamRoleName: input.iamRoleName }).andThen((result) => {
      if (result.nextToken) {
        return fetchAllAttachedRolePolicyArns(listAttachedRolePoliciesFunc)({ iamRoleName: input.iamRoleName, nextToken: result.nextToken }).map(
          (nextResult) => {
            return {
              attachedPolicyArns: result.attachedPolicyArns.concat(nextResult.attachedPolicyArns),
              nextToken: nextResult.nextToken,
            };
          }
        );
      }
      return okAsync(result);
    });
  };
