import { createStampHubLogger } from "./logger";
import { stampHubRouter } from "./router";
import { StampHubContext, t } from "./trpc";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { createStampSystemCatalog } from "./system-catalog";

export function createStampHubHTTPServer(context: StampHubContext, port: number) {
  const stampSystemCatalog = createStampSystemCatalog({
    resourceDBProvider: context.db.resourceDB,
    catalogConfigProvider: context.config.catalogConfig,
  });
  context.config.registerCatalogConfig.register(stampSystemCatalog);

  createHTTPServer({
    router: stampHubRouter,
    createContext: (prop) => {
      const requestContextHeader = prop.req.headers["x-stamp-request-context"];
      if (typeof requestContextHeader === "string") {
        try {
          const requestContext = requestContextHeader ? JSON.parse(requestContextHeader) : {};
          return { ...context, requestContext };
        } catch (e) {
          createStampHubLogger().error("Failed to parse request context", e);
        }
      }
      return context;
    },
  }).listen(port);
}

export function createStampHubStandAloneCallerFactory(context: StampHubContext) {
  const stampSystemCatalog = createStampSystemCatalog({
    resourceDBProvider: context.db.resourceDB,
    catalogConfigProvider: context.config.catalogConfig,
  });
  context.config.registerCatalogConfig.register(stampSystemCatalog);

  const createCaller = t.createCallerFactory(stampHubRouter);
  return (requestContext?: Record<string, string>) => createCaller({ ...context, requestContext });
}
