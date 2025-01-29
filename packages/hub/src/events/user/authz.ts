import { IsAdmin } from "../admin/isAdmin";
import { EditUserInput } from "../../inputAuthzModel";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import { StampHubError } from "../../error";

export type CheckCanEditUser = <T extends EditUserInput>(input: T) => ResultAsync<T, StampHubError>;

export const checkCanEditUser =
  (isAdmin: IsAdmin): CheckCanEditUser =>
  (input) => {
    return isAdmin({ userId: input.requestUserId }).andThen((isAdmin) => {
      if (isAdmin) {
        return okAsync(input);
      } else {
        return errAsync(new StampHubError("Permission denied", "Permission denied", "FORBIDDEN"));
      }
    });
  };
