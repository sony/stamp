import { StampHubError, convertStampHubError } from "../../error";
import { ApprovalRequestDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { z } from "zod";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync } from "neverthrow";
import { UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { ValidateRequestUserId } from "../../events/user/validation";

import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";
import { ApprovalRequest } from "@stamp-lib/stamp-types/models";
import { validateApprovalFlowId } from "../../events/approval-flow/validation";

export const ListByApprovalFlowId = z.object({
  catalogId: z.string(),
  approvalFlowId: z.string(),
  paginationToken: z.string().optional(),
  requestDate: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
  requestUserId: UserId,
});
export type ListByApprovalFlowId = z.infer<typeof ListByApprovalFlowId>;

export function listByApprovalFlowIdWorkflow(
  input: ListByApprovalFlowId,
  getCatalogConfigProvider: CatalogConfigProvider["get"],
  approvalRequestDBProvider: ApprovalRequestDBProvider
): ResultAsync<{ items: Array<ApprovalRequest>; paginationToken?: string }, StampHubError> {
  return parseZodObjectAsync(input, ListByApprovalFlowId)
    .andThen(createGetCatalogConfig(getCatalogConfigProvider))
    .andThen(validateApprovalFlowId)
    .andThen((parsedInput) => {
      return approvalRequestDBProvider.listByApprovalFlowId({
        catalogId: parsedInput.catalogId,
        approvalFlowId: parsedInput.approvalFlowId,
        requestDate: parsedInput.requestDate,
        paginationToken: parsedInput.paginationToken,
      });
    })
    .mapErr(convertStampHubError);
}

export const ListByRequestUserIdInput = z.object({
  userId: UserId,
  paginationToken: z.string().optional(),
  requestDate: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
  requestUserId: UserId,
  limit: z.number().int().min(1).max(200).optional(),
});
export type ListByRequestUserIdInput = z.infer<typeof ListByRequestUserIdInput>;

export type ListByRequestUserIdFunc = <T extends ListByRequestUserIdInput>(
  input: T
) => ResultAsync<{ items: Array<ApprovalRequest>; paginationToken?: string }, StampHubError>;

export const listByRequestUserIdWorkflow =
  (listByRequestUserId: ApprovalRequestDBProvider["listByRequestUserId"], validateRequestUserId: ValidateRequestUserId): ListByRequestUserIdFunc =>
  (input: ListByRequestUserIdInput) => {
    return parseZodObjectAsync(input, ListByRequestUserIdInput)
      .andThen(validateRequestUserId)
      .andThen((parsedInput) => {
        return listByRequestUserId({
          requestUserId: parsedInput.requestUserId,
          requestDate: parsedInput.requestDate,
          paginationToken: parsedInput.paginationToken,
        });
      })
      .mapErr(convertStampHubError);
  };
