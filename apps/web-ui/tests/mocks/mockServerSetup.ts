import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { AnyRouter } from "@trpc/server";
import { createServer } from "http";

export async function setUpMockStampServer(mockRouter: AnyRouter) {
  console.log("setUpMockStampServer!!!");

  const handler = createHTTPHandler({
    router: mockRouter,
    createContext() {
      return {};
    },
  });
  const httpServer = createServer((req, res) => {
    console.log(`httpServer: Received request for ${req.url}`);
    handler(req, res);
  }).listen(4000);

  return async () => {
    httpServer.removeAllListeners();
    httpServer.close();
    console.log("tearDown MockStampServer!!!");
  };
}

import { spawn } from "child_process";
import path from "path";

export async function setUpMockNextServer() {
  console.log("setUpMockNextServer!!!");
  const mockServerPath = path.join(process.cwd(), "tests/mocks/mockNextServer.ts");
  const serverProcess = spawn("npx", ["ts-node", "--compiler-options", '{"module":"commonjs"}', mockServerPath], { detached: true });

  const serverReady = new Promise<void>((resolve) => {
    serverProcess.stdout.on("data", (data) => {
      console.log(`Server stdout: ${data}`);
      if (data.includes("Listening on")) {
        resolve();
      }
    });
  });

  serverProcess.stderr.on("data", (data) => {
    console.error(`Server stderr: ${data}`);
  });

  serverProcess.on("close", (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  // Wait for the server to be ready
  await serverReady;

  return async () => {
    process.kill(-serverProcess.pid!);
    console.log("tearDown MockNextServer!!!");
  };
}
