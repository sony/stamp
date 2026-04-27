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
import { okAsync } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";
import type { SchedulerProvider } from "@stamp-lib/stamp-types/pluginInterface/scheduler";
import type { SchedulerEvent } from "@stamp-lib/stamp-types/models";

// In-memory scheduler plugin so the local ephemeral dev server can exercise
// approval flows that set `autoRevokeDuration` (e.g. the by-stable-approver
// flow which requires Auto Revoke). Events are stored in process memory and
// are NOT actually executed — this is purely for local UI development.
function createEphemeralSchedulerPlugin(): SchedulerProvider {
  const store = new Map<string, SchedulerEvent>();
  let counter = 0;
  return {
    getSchedulerEvent: ({ id }) => {
      const event = store.get(id);
      return okAsync(event ? some(event) : none);
    },
    createSchedulerEvent: ({ eventType, property, schedulePattern }) => {
      const id = `ephemeral-scheduler-${++counter}`;
      const event: SchedulerEvent = { id, eventType, property, schedulePattern };
      store.set(id, event);
      return okAsync(event);
    },
    updateSchedulerEvent: ({ id, eventType, property, schedulePattern }) => {
      const event: SchedulerEvent = { id, eventType, property, schedulePattern };
      store.set(id, event);
      return okAsync(event);
    },
    deleteSchedulerEvent: ({ id }) => {
      store.delete(id);
      return okAsync(undefined);
    },
  };
}

async function main() {
  const logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "INFO";
  const logger = createLogger(logLevel, { moduleName: "web-ui" });
  const config = await createConfigProvider({
    catalogs: [unicornRentalCatalog],
  });

  const ephemeralDB = createEphemeralDBPlugin({ logLevel: logLevel });
  const ephemeralScheduler = createEphemeralSchedulerPlugin();
  createStampHubHTTPServer(
    { db: ephemeralDB, config: config, identity: ephemeralIdentityPluginForAllUserAdmin, scheduler: ephemeralScheduler },
    4000
  );
  logger.info("Ephemeral in-memory scheduler enabled (local dev only; events are not executed).");

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
