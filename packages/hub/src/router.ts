import { router } from "./trpc";
import { systemRequestRouter } from "./route/systemRequest";
import { userRequestRouter } from "./route/userRequest";

export const stampHubRouter = router({
  systemRequest: systemRequestRouter, // For system request that doesn't require user authentication and authorization
  userRequest: userRequestRouter, // For user request that require user authentication and authorization
});

export type StampHubRouter = typeof stampHubRouter;
