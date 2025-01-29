import { router } from "./../../trpc";

import { accountLinkRouter } from "./accountLink";
import { accountLinkSessionRouter } from "./accountLinkSession";
import { userRouter } from "./user";
import { schedulerHandlerRouter } from "./schedulerHandler";
import { notificationRouter } from "./notification";

export { accountLinkRouter } from "./accountLink";
export { accountLinkSessionRouter } from "./accountLinkSession";
export { notificationRouter } from "./notification";
export { schedulerHandlerRouter } from "./schedulerHandler";
export { userRouter } from "./user";

// For system request that doesn't require user authentication and authorization
export const systemRequestRouter = router({
  accountLink: accountLinkRouter,
  accountLinkSession: accountLinkSessionRouter,
  notification: notificationRouter,
  schedulerHandler: schedulerHandlerRouter,
  user: userRouter,
});
