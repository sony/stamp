import { createServer } from "node:http";
import { serve } from "@hono/node-server";
import { createPluginRouter } from "@stamp-lib/stamp-plugin-router";
import { createStampHubHTTPServer } from "@stamp-lib/stamp-hub";
import { createConfigProvider } from "@stamp-lib/stamp-config";
import { createEphemeralDBPlugin } from "@stamp-lib/stamp-ephemeral-db-plugin";
import { ephemeralIdentityPlugin, ephemeralIdentityPluginForAllUserAdmin } from "@stamp-lib/stamp-ephemeral-identity-plugin";
import { createSlackPlugin } from "@stamp-lib/stamp-slack-plugin";
import { unicornRentalCatalog } from "@stamp-lib/stamp-example-catalog";
import { createStampServer } from "./stampServer";
import { createIamIdcCatalog } from "@stamp-lib/stamp-iam-idc-catalog";
import { createIamRoleCatalog } from "@stamp-lib/stamp-iam-role-catalog";
import { createLogger, LogLevel } from "@stamp-lib/stamp-logger";

async function main() {
  const logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "INFO";
  const logger = createLogger(logLevel, { moduleName: "web-ui" });
  const config = await createConfigProvider({
    catalogs: [unicornRentalCatalog],
  });

  const ephemeralDB = createEphemeralDBPlugin({ logLevel: logLevel });
  createStampHubHTTPServer({ db: ephemeralDB, config: config, identity: ephemeralIdentityPluginForAllUserAdmin }, 4000);

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
