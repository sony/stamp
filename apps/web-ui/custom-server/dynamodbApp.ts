import { createConfigProvider } from "@stamp-lib/stamp-config";
import { createDynamodbDBPlugin } from "@stamp-lib/stamp-dynamodb-db-plugin";
import { createDynamodbIdentityPlugin } from "@stamp-lib/stamp-dynamodb-identity-plugin";
import { unicornRentalCatalog } from "@stamp-lib/stamp-example-catalog";
import { createStampHubHTTPServer } from "@stamp-lib/stamp-hub";
import { createLogger, LogLevel } from "@stamp-lib/stamp-logger";
import { createPluginRouter } from "@stamp-lib/stamp-plugin-router";
import { serve } from "@hono/node-server";
import { createServer } from "node:http";
import { createStampServer } from "./stampServer";

async function main() {
  const logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "INFO";
  const logger = createLogger(logLevel, { moduleName: "web-ui" });

  const dynamodbDB = createDynamodbDBPlugin({
    region: "us-west-2",
    tableNamePrefix: process.env.DYNAMO_TABLE_PREFIX!,
    logLevel: logLevel,
  });

  const dynamodBIdentity = createDynamodbIdentityPlugin({
    region: "us-west-2",
    tableNamePrefix: process.env.DYNAMO_TABLE_PREFIX!,
    logLevel: logLevel,
  });

  const config = await createConfigProvider({
    catalogs: [unicornRentalCatalog],
  });

  createStampHubHTTPServer({ db: dynamodbDB, config: config, identity: dynamodBIdentity }, 4000);

  const pluginRouter = createPluginRouter({ basePath: "/plugin", plugins: {} });

  const createServerHttp: typeof createServer = await createStampServer();
  const serverOptions = {
    fetch: pluginRouter.fetch,
    port: 3000,
    createServer: createServerHttp,
  };
  serve(serverOptions, (info) => {
    logger.info(`Listening on http://localhost:${info.port}`);
  });
}

main();
