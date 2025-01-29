import { DeleteUserInput } from "./input";
import { CheckCanEditUser } from "../../../events/user/authz";
import { errAsync, ResultAsync } from "neverthrow";
import { convertStampHubError, StampHubError } from "../../../error";
import { DeleteUser, ListGroupMemberShipByUser } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { parseZodObjectAsync } from "../../../utils/neverthrow";

export const deleteUser =
  (checkCanEditUser: CheckCanEditUser, deleteUser: DeleteUser, listGroupMemberShipByUser: ListGroupMemberShipByUser) =>
  (input: DeleteUserInput): ResultAsync<void, StampHubError> => {
    if (input.userId === input.requestUserId) {
      return errAsync(convertStampHubError(new StampHubError("Cannot delete self", "Cannot delete self", "BAD_REQUEST")));
    }
    return parseZodObjectAsync(input, DeleteUserInput)
      .andThen(checkCanEditUser)
      .andThen((input) =>
        listGroupMemberShipByUser({ userId: input.userId }).andThen((groups) => {
          if (groups.items.length > 0) {
            return errAsync(
              convertStampHubError(new StampHubError("User belongs to groups", "Cannot delete user who belongs to one or more groups", "FORBIDDEN"))
            );
          }
          return deleteUser({ userId: input.userId });
        })
      )
      .mapErr(convertStampHubError);
  };
