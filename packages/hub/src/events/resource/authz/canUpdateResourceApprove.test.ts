import { describe, expect, it, vi } from "vitest";
import { checkCanUpdateResourceApproverImpl } from "./canUpdateResourceApprove";
import { UpdateResourceApproverInput } from "../../../inputAuthzModel";
import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { ResourceHandlers, HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { some, none } from "@stamp-lib/stamp-option";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { IdentityPluginError } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ConfigError } from "@stamp-lib/stamp-types/configInterface";
import { okAsync, errAsync, err, ok } from "neverthrow";

const catalogId = "test-catalog-id";
const resourceId = "test-resource-id";
const resourceTypeId = "test-resource-type-id";
const requestUserId = "b2715525-4850-9e83-2817-35b6b22bf0bd"; // uuid is meaningless and was generated for testing.
const approverGroupId = "1f10d463-a2fe-c407-2b95-05b561346c8b"; // uuid is meaningless and was generated for testing.
const parentResourceId = "test-parent-resource-id";
const ownerGroupId = "96fc6a4c-b5d3-8c2b-0307-165168a023cd"; // uuid is meaningless and was generated for testing.

const testResourceTypeHandler: ResourceHandlers = {
  createResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  deleteResource: async () => {
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
  },
  getResource: async () => {
    return ok(some({ resourceId: resourceId, name: "test name", params: {}, parentResourceId: parentResourceId }));
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

const testResourceTypeConfig = {
  id: resourceTypeId,
  name: "test-resource-type-name",
  description: "test-resource-type-description",
  createParams: [],
  infoParams: [],
  handlers: testResourceTypeHandler,
  isCreatable: false,
  isUpdatable: false,
  isDeletable: false,
  ownerManagement: true,
  approverManagement: true,
  parentResourceTypeId: "test-parent-resource-type-id",
};
const testCatalogConfig: CatalogConfig = {
  id: resourceTypeId,
  name: "test-catalog-name",
  description: "test-description-approval-flows",
  approvalFlows: [],
  resourceTypes: [testResourceTypeConfig],
};

describe("Testing canUpdateResourceApprove", () => {
  describe("checkCanUpdateResourceApproverImpl", () => {
    const getCatalogDBProviderSuccess = vi.fn().mockReturnValue(
      okAsync(
        some({
          ownerGroupId: ownerGroupId,
        })
      )
    );
    const getCatalogConfigProviderSuccess = vi.fn().mockReturnValue(okAsync(some(testCatalogConfig)));
    const getResourceDBProviderSuccess = vi.fn().mockReturnValue(
      okAsync(
        some({
          ownerGroupId: ownerGroupId,
        })
      )
    );
    const getGroupMemberShipProviderSuccess = vi.fn().mockReturnValue(okAsync(some({})));

    const input: UpdateResourceApproverInput = {
      catalogId: catalogId,
      resourceTypeId: resourceTypeId,
      resourceId: resourceId,
      requestUserId: requestUserId,
      approverGroupId: approverGroupId,
    };

    it("should return ok with valid input", async () => {
      const expected = structuredClone(input);

      const result = await checkCanUpdateResourceApproverImpl(
        input,
        getCatalogDBProviderSuccess,
        getCatalogConfigProviderSuccess,
        getResourceDBProviderSuccess,
        getGroupMemberShipProviderSuccess
      );

      if (result.isErr()) {
        throw result.error;
      }

      expect(result.value).toEqual(expected);
    });

    it("should return ok even if getCatalogDBProvider returns none", async () => {
      const getCatalogDBProviderNone = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanUpdateResourceApproverImpl(
        input,
        getCatalogDBProviderNone,
        getCatalogConfigProviderSuccess,
        getResourceDBProviderSuccess,
        getGroupMemberShipProviderSuccess
      );

      if (result.isErr()) {
        throw result.error;
      }

      expect(result.isOk()).toBe(true);
    });

    it("should return error with BAD_REQUEST if handler returns none", async () => {
      const getResourceHandlerNone = vi.fn().mockReturnValue(ok(none));
      const handlerErrorConfig = {
        ...testCatalogConfig,
        resourceTypes: [
          {
            ...testResourceTypeConfig,
            handlers: {
              ...testResourceTypeHandler,
              getResource: getResourceHandlerNone,
            },
          },
        ],
      };
      const getCatalogConfigProviderNone = vi.fn().mockReturnValue(okAsync(some(handlerErrorConfig)));

      const result = await checkCanUpdateResourceApproverImpl(
        input,
        getCatalogDBProviderSuccess,
        getCatalogConfigProviderNone,
        getResourceDBProviderSuccess,
        getGroupMemberShipProviderSuccess
      );

      if (result.isOk()) {
        throw result.value;
      }

      expect(result.error.systemMessage).toBe("Resource not found");
      expect(result.error.userMessage).toBe("Resource Not Found");
      expect(result.error.code).toBe("BAD_REQUEST");
    });

    it("should return error with FORBIDDEN if DB providers return none", async () => {
      const getCatalogDBProviderNone = vi.fn().mockReturnValue(okAsync(none));
      const getResourceDBProviderNone = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanUpdateResourceApproverImpl(
        input,
        getCatalogDBProviderNone,
        getCatalogConfigProviderSuccess,
        getResourceDBProviderNone,
        getGroupMemberShipProviderSuccess
      );

      if (result.isOk()) {
        throw result.value;
      }

      expect(result.error.systemMessage).toBe("Permission denied");
      expect(result.error.userMessage).toBe("Permission Denied");
      expect(result.error.code).toBe("FORBIDDEN");
    });

    it("should return error if handler returns error", async () => {
      const getResourceHandlerError = vi.fn().mockReturnValue(err(new HandlerError("failed to get resource", "INTERNAL_SERVER_ERROR")));
      const handlerErrorConfig = {
        ...testCatalogConfig,
        resourceTypes: [
          {
            ...testResourceTypeConfig,
            handlers: {
              ...testResourceTypeHandler,
              getResource: getResourceHandlerError,
            },
          },
        ],
      };
      const getCatalogConfigProviderError = vi.fn().mockReturnValue(okAsync(some(handlerErrorConfig)));

      const result = await checkCanUpdateResourceApproverImpl(
        input,
        getCatalogDBProviderSuccess,
        getCatalogConfigProviderError,
        getResourceDBProviderSuccess,
        getGroupMemberShipProviderSuccess
      );

      expect(result.isErr()).toBe(true);
    });

    it.each([
      [
        "getCatalogDBProvider returns error",
        vi.fn().mockReturnValue(errAsync(new DBError("This is DB Error", "INTERNAL_SERVER_ERROR"))),
        getCatalogConfigProviderSuccess,
        getResourceDBProviderSuccess,
        getGroupMemberShipProviderSuccess,
      ],
      [
        "getCatalogConfigProvider",
        getCatalogDBProviderSuccess,
        vi.fn().mockReturnValue(errAsync(new ConfigError("This is Config Error"))),
        getResourceDBProviderSuccess,
        getGroupMemberShipProviderSuccess,
      ],
      [
        "getResourceDBProvider returns error",
        getCatalogDBProviderSuccess,
        getCatalogConfigProviderSuccess,
        vi.fn().mockReturnValue(errAsync(new DBError("This is DB Error", "INTERNAL_SERVER_ERROR"))),
        getGroupMemberShipProviderSuccess,
      ],
      [
        "getGroupMemberShipProvider returns error",
        getCatalogDBProviderSuccess,
        getCatalogConfigProviderSuccess,
        getResourceDBProviderSuccess,
        vi.fn().mockReturnValue(errAsync(new IdentityPluginError("This is Identity Plugin Error"))),
      ],
    ])("should return error", async (key, fn1, fn2, fn3, fn4) => {
      const result = await checkCanUpdateResourceApproverImpl(input, fn1, fn2, fn3, fn4);

      expect(result.isErr()).toBe(true);
    });
  });
});
