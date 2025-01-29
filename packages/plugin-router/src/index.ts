import { Hono } from "hono";

export type PluginRouterConfig = {
  plugins: Record<string, Hono>;
  basePath: string;
};

export function createPluginRouter(config: PluginRouterConfig) {
  const app = new Hono().basePath(config.basePath);
  for (const [name, plugin] of Object.entries(config.plugins)) {
    app.route(`/${name}`, plugin);
  }
  return app;
}
