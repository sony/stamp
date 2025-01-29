import { Result, ok } from "neverthrow";
import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
export type ConvertRepositoryRolesToItemsInput = { roleName: string; value: string; isJumpIamRole: boolean };
export type AuditItem = { type: "permission"; name: string; values: string[] };
export type ConvertRepositoryRolesToItemsOutput = { auditItems: AuditItem[] };

export const convertRepositoryRolesToAuditItems = (
  results: ConvertRepositoryRolesToItemsInput[]
): Result<ConvertRepositoryRolesToItemsOutput, HandlerError> => {
  const itemsMap: { [key: string]: AuditItem } = {};
  results.forEach((result) => {
    if (!itemsMap[result.roleName]) {
      itemsMap[result.roleName] = {
        type: "permission",
        name: `${result.roleName} IAM Role`,
        values: [],
      };
    }
    itemsMap[result.roleName].values.push(`${result.value} ${result.isJumpIamRole ? "Jump" : "GitHub"} IAM Role`);
  });
  const items: AuditItem[] = Object.values(itemsMap);
  return ok({ auditItems: items });
};
