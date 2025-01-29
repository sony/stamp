import { IdentityProvider, UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ResultAsync } from "neverthrow";
import { StampHubError, convertStampHubError } from "../../error";
import z from "zod";

export const IsAdminInput = z.object({ userId: UserId });
export type IsAdminInput = z.infer<typeof IsAdminInput>;

export type IsAdmin = (input: IsAdminInput) => ResultAsync<boolean, StampHubError>;

export const isAdmin =
  (getUser: IdentityProvider["user"]["get"]) =>
  (input: IsAdminInput): ResultAsync<boolean, StampHubError> => {
    return getUser(input)
      .map((user) => {
        if (user.isSome()) {
          return user.value.role?.includes("Admin") === true;
        } else {
          return false;
        }
      })
      .mapErr(convertStampHubError);
  };
