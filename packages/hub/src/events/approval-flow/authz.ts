import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { EditApprovalFlowInput } from "../../inputAuthzModel";
import { IsCatalogOwner } from "../catalog/ownership/isCatalogOwner";

export type CheckCanEditApprovalFlow = <T extends EditApprovalFlowInput>(input: T) => ResultAsync<T, StampHubError>;
export function checkCanEditApprovalFlowImpl<T extends EditApprovalFlowInput>(input: T, isCatalogOwner: IsCatalogOwner): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, EditApprovalFlowInput)
    .andThen((parsedInput) => {
      // Check Permission
      const isCatalogOwnerResult = isCatalogOwner(parsedInput);

      return ResultAsync.combine([isCatalogOwnerResult]);
    })
    .andThen(([isCatalogOwner]) => {
      if (isCatalogOwner) {
        return okAsync(input);
      } else {
        return errAsync(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN"));
      }
    })
    .mapErr(convertStampHubError);
}

export function createCheckCanEditApprovalFlow(isCatalogOwner: IsCatalogOwner): CheckCanEditApprovalFlow {
  return (input) => checkCanEditApprovalFlowImpl(input, isCatalogOwner);
}
