import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { ValidatedAwsAccountInput, AwsAccount } from "../../types/awsAccount";
import { unregisterAwsAccount as unregister } from "../../events/awsAccount/unregisterAwsAccount";
import z from "zod";

type Config = { region: string; accountManagementTableName: string };
export const UnregisterAwsAccountInput = ValidatedAwsAccountInput;
export type UnregisterAwsAccountInput = z.infer<typeof UnregisterAwsAccountInput>;
type UnregisterAwsAccount = (input: UnregisterAwsAccountInput) => ResultAsync<AwsAccount, HandlerError>;

export const unregisterAwsAccount =
  (logger: Logger, config: Config): UnregisterAwsAccount =>
  (input) => {
    return unregister(logger, config)(input);
  };
