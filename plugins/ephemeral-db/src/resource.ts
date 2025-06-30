import { Logger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { CatalogId, ResourceId, ResourceOnDB, ResourceTypeId } from "@stamp-lib/stamp-types/models";
import { ResourceDBProvider, ResourceInput, UpdatePendingUpdateParamsInput } from "@stamp-lib/stamp-types/pluginInterface/database";
import { errAsync, okAsync } from "neverthrow";

const resourceMap = new Map<CatalogId, Map<ResourceTypeId, Map<ResourceId, ResourceOnDB>>>();
export function createResourceDBProvider(logger: Logger): ResourceDBProvider {
  return {
    getById: (input: ResourceInput) => {
      logger.info("ResourceDB.getById", input.id);
      const resource = structuredClone(resourceMap.get(input.catalogId)?.get(input.resourceTypeId)?.get(input.id));
      if (resource === undefined) {
        return okAsync(none);
      } else {
        return okAsync(some(resource));
      }
    },
    set: (resourceOnDB: ResourceOnDB) => {
      logger.info("ResourceDB.set");
      if (!resourceMap.has(resourceOnDB.catalogId)) {
        resourceMap.set(resourceOnDB.catalogId, new Map());
      }
      if (!resourceMap.get(resourceOnDB.catalogId)?.has(resourceOnDB.resourceTypeId)) {
        resourceMap.get(resourceOnDB.catalogId)?.set(resourceOnDB.resourceTypeId, new Map());
      }
      resourceMap.get(resourceOnDB.catalogId)?.get(resourceOnDB.resourceTypeId)?.set(resourceOnDB.id, structuredClone(resourceOnDB));
      return okAsync(structuredClone(resourceOnDB));
    },
    updatePendingUpdateParams: (input: UpdatePendingUpdateParamsInput) => {
      logger.info("ResourceDB.updatePendingUpdateParams", input.id);
      if (!resourceMap.has(input.catalogId)) {
        return errAsync(new Error("Catalog not found"));
      }
      if (!resourceMap.get(input.catalogId)?.has(input.resourceTypeId)) {
        return errAsync(new Error("Resource type not found"));
      }
      const resource = resourceMap.get(input.catalogId)?.get(input.resourceTypeId)?.get(input.id);
      if (!resource) {
        return errAsync(new Error("Resource not found"));
      }
      const updatedResource: ResourceOnDB = {
        ...resource,
        pendingUpdateParams: input.pendingUpdateParams,
      };
      resourceMap.get(input.catalogId)?.get(input.resourceTypeId)?.set(input.id, structuredClone(updatedResource));
      return okAsync(structuredClone(updatedResource));
    },
    delete: (input: ResourceInput) => {
      logger.info("ResourceDB.delete", input.id);
      resourceMap.delete(input.id);
      return okAsync(undefined);
    },
    createAuditNotification: (input) => {
      logger.info("ResourceDB.createAuditNotification", input.id);
      const resource = structuredClone(resourceMap.get(input.catalogId)?.get(input.resourceTypeId)?.get(input.id));
      if (!resource) {
        return errAsync(new Error("Resource not found"));
      }
      const newResourceOnDB: ResourceOnDB = {
        id: resource.id,
        catalogId: resource.catalogId,
        resourceTypeId: resource.resourceTypeId,
        approverGroupId: resource.approverGroupId,
        ownerGroupId: resource.ownerGroupId,
        auditNotifications: [
          {
            schedulerEventId: input.schedulerEventId,
            cronExpression: input.cronExpression,
            id: "",
            notificationChannel: input.notificationChannel,
          },
        ],
      };
      return okAsync(newResourceOnDB);
    },
    updateAuditNotification: (input) => {
      logger.info("ResourceDB.updateAuditNotification", input.id);
      const resource = structuredClone(resourceMap.get(input.catalogId)?.get(input.resourceTypeId)?.get(input.id));
      if (!resource) {
        return errAsync(new Error("Resource not found"));
      }
      const newResourceOnDB: ResourceOnDB = {
        id: resource.id,
        catalogId: resource.catalogId,
        resourceTypeId: resource.resourceTypeId,
        approverGroupId: resource.approverGroupId,
        ownerGroupId: resource.ownerGroupId,
        auditNotifications: [
          {
            schedulerEventId: input.schedulerEventId,
            cronExpression: input.cronExpression,
            id: input.auditNotificationId,
            notificationChannel: input.notificationChannel,
          },
        ],
      };
      return okAsync(newResourceOnDB);
    },
    deleteAuditNotification: (input) => {
      logger.info("ResourceDB.deleteAuditNotification", input.id);
      const resource = structuredClone(resourceMap.get(input.catalogId)?.get(input.resourceTypeId)?.get(input.id));
      if (!resource) {
        return errAsync(new Error("Resource not found"));
      }
      const newResourceOnDB: ResourceOnDB = {
        id: resource.id,
        catalogId: resource.catalogId,
        resourceTypeId: resource.resourceTypeId,
        approverGroupId: resource.approverGroupId,
        ownerGroupId: resource.ownerGroupId,
      };
      return okAsync(newResourceOnDB);
    },
  };
}
