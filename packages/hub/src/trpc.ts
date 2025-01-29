import { initTRPC } from "@trpc/server";
import { DBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { ConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { IdentityProvider } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { SchedulerProvider } from "@stamp-lib/stamp-types/pluginInterface/scheduler";

export type StampHubContext = {
  db: DBProvider;
  config: ConfigProvider;
  identity: IdentityProvider;
  scheduler?: SchedulerProvider;
  requestContext?: Record<string, string>;
};

export const t = initTRPC.context<StampHubContext>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
