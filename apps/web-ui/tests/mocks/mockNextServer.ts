import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createServer } from "http";
import next from "next";
import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";

export async function launchMockNextServer() {
  console.log("launchMockNextServer!!!");

  await clearNextCache();

  const app = next({
    dev: process.env.NODE_ENV !== "production",
    dir: "./",
    customServer: true,
  });

  const handle = app.getRequestHandler();
  await app.prepare();

  const hono = new Hono();
  const createHttpServer: typeof createServer = () => {
    return createServer((req, res) => {
      // console.log(`honoNodeServer: Received request for ${req.url}`);
      handle(req, res);
    });
  };
  const serverOptions = {
    fetch: hono.fetch,
    port: 3000,
    createServer: createHttpServer,
  };
  const honoNodeServer = serve(serverOptions, (info) => {
    console.log(`Listening on http://localhost:${info.port}`);
  });
  console.log("launchMockNextServer Done!!!");
}

async function clearNextCache() {
  const fetchCacheDir = path.join(process.cwd(), ".next/cache/fetch-cache");
  console.log("fetchCacheDir:", fetchCacheDir);
  if (fs.existsSync(fetchCacheDir)) {
    try {
      await fsPromises.rm(fetchCacheDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Error removing directory:", error);
    }
  }

  // show the contents of the .next/cache directory
  const cacheDir = path.join(process.cwd(), ".next/cache");
  if (fs.existsSync(cacheDir)) {
    const files = await fsPromises.readdir(path.join(process.cwd(), ".next/cache"));
    console.log("files:", files);
  }
}

launchMockNextServer();
