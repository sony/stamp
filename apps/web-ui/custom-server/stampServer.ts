import { createServer, ServerOptions, RequestListener } from "node:http";
import next from "next";

export const createStampServer = async (): Promise<typeof createServer> => {
  const app = next({
    dev: process.env.NODE_ENV !== "production",
    dir: "./",
    customServer: true,
  });
  const handle = app.getRequestHandler();
  await app.prepare();

  const pluginUrlPattern = /^\/plugin.*$/;

  // Satisfies the type of the http.createServer function argument
  return ((arg1?: ServerOptions | RequestListener, arg2?: RequestListener) => {
    if (typeof arg1 === "undefined" && typeof arg2 === "undefined") {
      throw new Error("createStampServer: RequestListener arg is required");
    }
    if (typeof arg1 === "function" && typeof arg2 === "undefined") {
      return createServer((req, res) => {
        if (pluginUrlPattern.test(req.url ?? "")) {
          if (arg1) {
            arg1(req, res);
          }
        } else {
          handle(req, res);
        }
      });
    }
    if (typeof arg1 === "object" && typeof arg2 === "undefined") {
      throw new Error("createStampServer: RequestListener arg is required");
    }
    if (typeof arg1 === "undefined" && typeof arg2 === "function") {
      return createServer((req, res) => {
        if (pluginUrlPattern.test(req.url ?? "")) {
          arg2(req, res);
        } else {
          handle(req, res);
        }
      });
    }
    if (typeof arg1 === "function" && typeof arg2 === "function") {
      return createServer((req, res) => {
        if (pluginUrlPattern.test(req.url ?? "")) {
          arg2(req, res);
        } else {
          handle(req, res);
        }
      });
    }
    if (typeof arg1 === "object" && typeof arg2 === "function") {
      return createServer(arg1, (req, res) => {
        if (pluginUrlPattern.test(req.url ?? "")) {
          arg2(req, res);
        } else {
          handle(req, res);
        }
      });
    }
  }) as typeof createServer;
};
