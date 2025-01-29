import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { CreateTargetIamRoleCommand, CreateTargetIamRoleCommandInput, CreatedTargetIamRole, TargetIamRole } from "../../types/targetIamRole";
import { CreateAssumeRolePolicy, DeleteAssumeRolePolicy } from "../iam-ops/assumeRolePolicy";
export type CreateTargetIamRole = (input: CreateTargetIamRoleCommand) => ResultAsync<CreatedTargetIamRole, HandlerError>;
export const createTargetIamRole =
  (createAssumeRolePolicy: CreateAssumeRolePolicy): CreateTargetIamRole =>
  (input: CreateTargetIamRoleCommand): ResultAsync<CreatedTargetIamRole, HandlerError> => {
    const parseResult = CreateTargetIamRoleCommandInput.safeParse(input);
    if (!parseResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${parseResult.error}`, "BAD_REQUEST", `Failed to parse input.: ${parseResult.error}`));
    }
    return createAssumeRolePolicy({
      prefixPolicyName: input.prefixName,
      targetRoleName: input.iamRoleName,
      targetAWSAccountId: input.accountId,
    }).andThen((createAssumeRolePolicyResult) => {
      return okAsync({
        accountId: parseResult.data.accountId,
        iamRoleName: parseResult.data.iamRoleName,
        id: `${input.accountId}#${input.iamRoleName}`,
        createdAt: new Date().toISOString(),
        assumeRolePolicyArn: createAssumeRolePolicyResult.assumeRolePolicyArn,
      });
    });
  };

export type DeleteTargetIamRole = (input: TargetIamRole) => ResultAsync<TargetIamRole, HandlerError>;
export const deleteTargetIamRole =
  (deleteAssumeRolePolicy: DeleteAssumeRolePolicy): DeleteTargetIamRole =>
  (input: TargetIamRole): ResultAsync<TargetIamRole, HandlerError> => {
    const parseResult = TargetIamRole.safeParse(input);
    if (!parseResult.success) {
      return errAsync(new HandlerError(`Failed to parse input.: ${parseResult.error}`, "BAD_REQUEST", `Failed to parse input.: ${parseResult.error}`));
    }
    return deleteAssumeRolePolicy({ assumeRolePolicyArn: input.assumeRolePolicyArn }).map(() => input);
  };
