import { expect, it, describe, vi } from "vitest";
import { GetResourceInfoInput, getResourceInfoImpl } from "./get";
import { ResourceHandlers, HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { ResourceTypeConfig } from "@stamp-lib/stamp-types/models";
import { some, none } from "@stamp-lib/stamp-option";
import { ok, okAsync, err, errAsync } from "neverthrow";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";

const resourceId = "test-resource-id";
const catalogId = "test-catalog-id";
const resourceTypeId = "test-iam-resource-type";
const parentResourceTypeId = "test-parent-resource-type-id";
const name = "test-resource-type-name";

const testResourceHandler: ResourceHandlers = {
  createResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  deleteResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  getResource: async () => {
    return ok(some({ resourceId: resourceId, name: name, params: {} }));
  },
  listResources: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  updateResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  listResourceAuditItem: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
};

describe("Testing get", () => {
  describe("getResourceInfoImpl", () => {
    const testResourceTypeConfig: ResourceTypeConfig = {
      id: "test-resource-type-id",
      name: name,
      description: "test-description",
      createParams: [],
      infoParams: [],
      handlers: testResourceHandler,
      isCreatable: false,
      isUpdatable: false,
      isDeletable: false,
      ownerManagement: true,
      approverManagement: true,
      parentResourceTypeId: parentResourceTypeId,
    };
    const input: GetResourceInfoInput = {
      catalogId: catalogId,
      resourceTypeId: resourceTypeId,
      resourceId: resourceId,
      resourceTypeConfig: testResourceTypeConfig,
    };

    it("should get resource info with valid input", async () => {
      const getResourceDBProviderSuccess = vi.fn().mockReturnValue(okAsync(some({})));

      const expected = {
        params: {},
        name: name,
        resourceId: resourceId,
        id: resourceId,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        parentResourceTypeId: parentResourceTypeId,
      };

      const result = await getResourceInfoImpl(input, getResourceDBProviderSuccess);

      if (result.isErr()) {
        throw result.error;
      }

      expect(result.value).toEqual(some(expected));
    });

    it("should get resource info even if getResourceDBProvider returns none", async () => {
      const getResourceDBProviderNone = vi.fn().mockReturnValue(okAsync(none));

      const expected = {
        params: {},
        name: name,
        resourceId: resourceId,
        id: resourceId,
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        parentResourceTypeId: parentResourceTypeId,
      };

      const result = await getResourceInfoImpl(input, getResourceDBProviderNone);

      if (result.isErr()) {
        throw result.error;
      }

      expect(result.value).toEqual(some(expected));
    });

    it("should return none if handler returns none", async () => {
      const getResourceHandlerNone = vi.fn().mockReturnValue(ok(none));
      const handlerNoneInput: GetResourceInfoInput = {
        ...input,
        resourceTypeConfig: {
          ...testResourceTypeConfig,
          handlers: {
            ...testResourceHandler,
            getResource: getResourceHandlerNone,
          },
        },
      };
      const getResourceDBProviderSuccess = vi.fn().mockReturnValue(okAsync(some({})));

      const result = await getResourceInfoImpl(handlerNoneInput, getResourceDBProviderSuccess);

      if (result.isErr()) {
        throw result.error;
      }

      expect(result.value).toBe(none);
    });

    it("should return error if handler returns error", async () => {
      const getResourceHandlerError = vi.fn().mockReturnValue(err(new HandlerError("failed to get resource", "INTERNAL_SERVER_ERROR")));
      const handlerErrorInput: GetResourceInfoInput = {
        ...input,
        resourceTypeConfig: {
          ...testResourceTypeConfig,
          handlers: {
            ...testResourceHandler,
            getResource: getResourceHandlerError,
          },
        },
      };
      const getResourceDBProviderSuccess = vi.fn().mockReturnValue(okAsync(some({})));

      const result = await getResourceInfoImpl(handlerErrorInput, getResourceDBProviderSuccess);

      expect(result.isErr()).toBe(true);
    });

    it("should return error if getResourceDBProvider returns error", async () => {
      const getResourceDBProviderError = vi.fn().mockReturnValue(errAsync(new DBError("This is DB Error", "INTERNAL_SERVER_ERROR")));

      const result = await getResourceInfoImpl(input, getResourceDBProviderError);

      expect(result.isErr()).toBe(true);
    });
  });
});
