import { HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResultAsync } from "neverthrow";
import { Logger } from "@stamp-lib/stamp-logger";
import { AwsAccount } from "../../types/awsAccount";
import { listAwsAccountInfo as list } from "../../events/awsAccount/listAwsAccountInfo";

type Config = { region: string; accountManagementTableName: string };
type GetListOfAwsAccountInfoItem = () => ResultAsync<Array<AwsAccount>, HandlerError>;

export const listAwsAccountInfo =
  (logger: Logger, config: Config): GetListOfAwsAccountInfoItem =>
  () => {
    return list(logger, config)();
  };
