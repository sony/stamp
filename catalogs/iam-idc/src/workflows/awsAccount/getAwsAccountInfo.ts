import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { ValidatedAwsAccountInput, AwsAccount } from "../../types/awsAccount";
import { getAwsAccountInfo as get } from "../../events/awsAccount/getAwsAccountInfo";
import { Option } from "@stamp-lib/stamp-option";
import z from "zod";

type Config = { region: string; accountManagementTableName: string };
export const GetAwsAccountInfoInput = ValidatedAwsAccountInput;
export type GetAwsAccountInfoInput = z.infer<typeof GetAwsAccountInfoInput>;
type GetAwsAccountInfo = (input: GetAwsAccountInfoInput) => ResultAsync<Option<AwsAccount>, HandlerError>;

export const getAwsAccountInfo =
  (logger: Logger, config: Config): GetAwsAccountInfo =>
  (input) => {
    return get(logger, config)(input);
  };
