import { UserProvider, UserId } from "@stamp-lib/stamp-types/pluginInterface/identity";

import { convertStampHubError, StampHubError } from "../../error";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { z } from "zod";
import { ResultAsync, okAsync, errAsync } from "neverthrow";

export const ValidateUserIdInput = z.object({
  userId: UserId,
});
export type ValidateUserIdInput = z.infer<typeof ValidateUserIdInput>;

export type ValidateUserId = <T extends { userId: string }>(input: T) => ResultAsync<T, StampHubError>;

export function validateUserIdImpl<T extends { userId: string }>(input: T, userProvider: UserProvider): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, ValidateUserIdInput)
    .andThen((parsedInput) => {
      return userProvider.get({ userId: parsedInput.userId });
    })
    .andThen((userOption) => {
      // check if  exist
      if (userOption.isNone()) {
        return errAsync(new StampHubError("User not found", "User Not Found", "BAD_REQUEST"));
      } else {
        return okAsync(input);
      }
    })
    .mapErr(convertStampHubError);
}

export function createValidateUserId(userProvider: UserProvider): ValidateUserId {
  return (input) => validateUserIdImpl(input, userProvider);
}

export const ValidateTargetUserIdInput = z.object({
  targetUserId: UserId,
});
export type ValidateTargetUserIdInput = z.infer<typeof ValidateTargetUserIdInput>;

export type ValidateTargetUserId = <T extends { targetUserId: string }>(input: T) => ResultAsync<T, StampHubError>;

export function validateTargetUserIdImpl<T extends { targetUserId: string }>(input: T, userProvider: UserProvider): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, ValidateTargetUserIdInput)
    .andThen((parsedInput) => {
      return userProvider.get({ userId: parsedInput.targetUserId });
    })
    .andThen((userOption) => {
      // check if  exist
      if (userOption.isNone()) {
        return errAsync(new StampHubError("Target User not found", "Target User Not Found", "BAD_REQUEST"));
      } else {
        return okAsync(input);
      }
    })
    .mapErr(convertStampHubError);
}

export function createValidateTargetUserId(userProvider: UserProvider): ValidateTargetUserId {
  return (input) => validateTargetUserIdImpl(input, userProvider);
}

export const ValidateRequestUserIdInput = z.object({
  requestUserId: UserId,
});
export type ValidateRequestUserIdInput = z.infer<typeof ValidateRequestUserIdInput>;

export type ValidateRequestUserId = <T extends { requestUserId: string }>(input: T) => ResultAsync<T, StampHubError>;

export function validateRequestUserIdImpl<T extends { requestUserId: string }>(input: T, userProvider: UserProvider): ResultAsync<T, StampHubError> {
  // Validate input
  return parseZodObjectAsync(input, ValidateRequestUserIdInput)
    .andThen((parsedInput) => {
      return userProvider.get({ userId: parsedInput.requestUserId });
    })
    .andThen((userOption) => {
      // check if  exist
      if (userOption.isNone()) {
        return errAsync(new StampHubError("Request user is not found", "Request user is not found", "BAD_REQUEST"));
      } else {
        return okAsync(input);
      }
    })
    .mapErr(convertStampHubError);
}

export function createValidateRequestUserId(userProvider: UserProvider): ValidateRequestUserId {
  return (input) => validateRequestUserIdImpl(input, userProvider);
}
