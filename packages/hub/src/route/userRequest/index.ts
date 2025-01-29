import { router } from "./../../trpc";

import { catalogRouter } from "./catalog";
import { groupRouter } from "./group";
import { approvalFlowRouter } from "./approvalFlow";
import { approvalRequestRouter } from "./approvalRequest";
import { resourceTypeRouter } from "./resourceType";
import { resourceRouter } from "./resource";
import { userRouter } from "./user";

export { approvalFlowRouter } from "./approvalFlow";
export { approvalRequestRouter } from "./approvalRequest";
export { catalogRouter } from "./catalog";
export { groupRouter } from "./group";
export { resourceRouter } from "./resource";
export { resourceTypeRouter } from "./resourceType";

// For user request that require user authentication and authorization
export const userRequestRouter = router({
  approvalFlow: approvalFlowRouter,
  approvalRequest: approvalRequestRouter,
  catalog: catalogRouter,
  group: groupRouter,
  resourceType: resourceTypeRouter,
  resource: resourceRouter,
  user: userRouter,
});
