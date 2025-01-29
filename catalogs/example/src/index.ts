import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { ApprovalFlowHandler, HandlerError, ResourceHandlers } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ApprovalFlowConfig, CatalogConfig, ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { err, ok } from "neverthrow";

const logger = createLogger("DEBUG", { moduleName: "example" });

const unicornStables = {
  "great-stable": { resourceId: "great-stable", name: "great stable", params: {} },
  "cool-stable": { resourceId: "cool-stable", name: "cool stable", params: {} },
};
// stable means a place where unicorns are kept.
const unicornStableResourceHandler: ResourceHandlers = {
  createResource: async (input) => {
    logger.info("create", input);
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  deleteResource: async (input) => {
    logger.info("delete", input);
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  getResource: async (input) => {
    logger.info("get", input);
    if (input.resourceId === "great-stable") {
      return ok(some({ resourceId: "great-stable", name: "great stable", params: {} }));
    } else {
      return ok(some({ resourceId: "cool-stable", name: "cool stable", params: {} }));
    }
  },
  listResources: async (input) => {
    logger.info("list", input);
    const resources = Object.entries(unicornStables).map(([, resource]) => {
      return resource;
    });
    return ok({
      resources,
    });
  },
  updateResource: async (input) => {
    logger.info("update", input);
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  listResourceAuditItem: async (input) => {
    logger.info("listAuditItem", input);
    return ok({ auditItems: [] });
  },
};

const unicornMap = new Map<string, { name: string; color: string; age: number; stableId: string; favoriteFood: string[] }>();

const unicornRentalResourceHandler: ResourceHandlers = {
  createResource: async (input) => {
    logger.info("create", input);
    const id = globalThis.crypto.randomUUID();
    const stableData = {
      name: input.inputParams.name as string,
      color: input.inputParams.color as string,
      age: input.inputParams.age as number,
      favoriteFood: input.inputParams.favoriteFood as string[],
      stableId: input.parentResourceId as string,
    };
    unicornMap.set(id, stableData);
    return ok({
      resourceId: id,
      name: stableData.name,
      params: {
        color: stableData.color,
        age: stableData.age,
        favoriteFood: stableData.favoriteFood,
      },
      parentResourceId: stableData.stableId,
    });
  },
  deleteResource: async (input) => {
    logger.info("delete", input);
    unicornMap.delete(input.resourceId);
    return ok(undefined);
  },
  getResource: async (input) => {
    logger.info("get", input);
    const stableData = unicornMap.get(input.resourceId);
    if (stableData === undefined) {
      return ok(none);
    }
    return ok(
      some({
        resourceId: input.resourceId,
        name: stableData.name,
        params: {
          color: stableData.color,
          age: stableData.age,
        },
        parentResourceId: stableData.stableId,
      })
    );
  },
  listResources: async (input) => {
    logger.info("list", input);
    const resources = [];
    for (const [id, unicorn] of unicornMap.entries()) {
      if (input.parentResourceId !== undefined && input.parentResourceId !== unicorn.stableId) {
        continue;
      }
      resources.push({
        resourceId: id,
        name: unicorn.name,
        params: {
          color: unicorn.color,
          age: unicorn.age,
          favoriteFood: unicorn.favoriteFood,
        },
        parentResourceId: unicorn.stableId,
      });
    }
    return ok({ resources });
  },
  updateResource: async (input) => {
    logger.info("update", input);
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  listResourceAuditItem: async (input) => {
    logger.info("listAuditItem", input);
    return ok({ auditItems: [] });
  },
};

const unicornRentalApplicationHandler: ApprovalFlowHandler = {
  approvalRequestValidation: async (input) => {
    logger.info("approvalRequestValidation", input);
    return ok({ isSuccess: true, message: "Unicorn rental request." });
  },
  approved: async (input) => {
    logger.info("approved", input);
    return ok({ isSuccess: true, message: "approved unicorn rental" });
  },
  revoked: async (input) => {
    logger.info("revoked", input);
    return ok({ isSuccess: true, message: "revoked unicorn rental" });
  },
};

const unicornStableResourceType: ResourceTypeConfig = {
  id: "unicorn-stable",
  name: "Unicorn Stable",
  description: "Unicorn stable resource type",
  createParams: [],
  infoParams: [],
  handlers: unicornStableResourceHandler,
  isCreatable: false,
  isUpdatable: false,
  isDeletable: false,
  ownerManagement: true,
  approverManagement: true,
};

const unicornResourceType: ResourceTypeConfig = {
  id: "unicorn",
  name: "Unicorn",
  description: "Unicorn rental resource type",
  createParams: [
    { type: "string", id: "name", name: "Name", required: true },
    { type: "string", id: "color", name: "Color", required: true },
    { type: "number", id: "age", name: "Age", required: false },
    { type: "boolean", id: "isSpecial", name: "Treat as Special", required: true },
    { type: "string[]", id: "favoriteFood", name: "Favorite Food", required: true },
  ],
  infoParams: [
    { type: "string", id: "color", name: "Color", edit: false },
    { type: "number", id: "age", name: "Age", edit: false },
    { type: "string[]", id: "favoriteFood", name: "Favorite Food", edit: false },
  ],
  handlers: unicornRentalResourceHandler,
  parentResourceTypeId: "unicorn-stable",
  isCreatable: true,
  isUpdatable: false,
  isDeletable: true,
  ownerManagement: false,
  approverManagement: false,
};

const unicornRentalApplicationConfig: ApprovalFlowConfig = {
  id: "unicorn-rental-application",
  name: "Approval Flow Example",
  description: "This is an unicorn rental application flow.",
  inputParams: [
    { type: "string", id: "name", name: "Name", required: true },
    { type: "number", id: "days", name: "Days", required: true },
    { type: "boolean", id: "isSpecial", name: "Treat as Special", required: true },
  ],
  inputResources: [{ resourceTypeId: "unicorn-stable" }, { resourceTypeId: "unicorn", parentResourceTypeId: "unicorn-stable" }],

  approver: { approverType: "approvalFlow" },
  handlers: unicornRentalApplicationHandler,
  enableRevoke: true,
};

const unicornRentalApplicationByStableApproverConfig: ApprovalFlowConfig = {
  id: "unicorn-rental-application-by-stable-approver",
  name: "Approval Flow Example by Stable Approver",
  description: "This is an unicorn rental application flow. The approver is a stable approver.",
  inputParams: [
    { type: "string", id: "name", name: "Name", required: true },
    { type: "number", id: "days", name: "Days", required: true },
    { type: "boolean", id: "isSpecial", name: "Treat as Special", required: true },
  ],
  inputResources: [{ resourceTypeId: "unicorn-stable" }, { resourceTypeId: "unicorn", parentResourceTypeId: "unicorn-stable" }],
  approver: { approverType: "resource", resourceTypeId: "unicorn-stable" },
  handlers: unicornRentalApplicationHandler,
  enableRevoke: true,
};

export const unicornRentalCatalog: CatalogConfig = {
  id: "unicorn-rental-catalog",
  name: "Unicorn Rental",
  description: "Approval flows for renting unicorns.",
  approvalFlows: [unicornRentalApplicationConfig, unicornRentalApplicationByStableApproverConfig],
  resourceTypes: [unicornStableResourceType, unicornResourceType],
};
