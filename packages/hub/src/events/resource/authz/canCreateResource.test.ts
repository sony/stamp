import { describe, expect, it, vi } from "vitest";
import { checkCanCreateResourceImpl } from "./canCreateResource";
import { CreateResourceInput } from "../../../inputAuthzModel";
import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { ResourceHandlers, HandlerError } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { some, none } from "@stamp-lib/stamp-option";
import { DBError } from "@stamp-lib/stamp-types/pluginInterface/database";
import { IdentityPluginError } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ConfigError } from "@stamp-lib/stamp-types/configInterface";
import { okAsync, errAsync, err } from "neverthrow";

const catalogId = "test-catalog-id";
const resourceTypeId = "test-resource-type-id";
const requestUserId = "b2715525-4850-9e83-2817-35b6b22bf0bd"; // uuid is meaningless and was generated for testing.
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
    return err(new HandlerError("not implemented", "INTERNAL_SERVER_ERROR"));
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
  anyoneCanCreate: true,
  parentResourceTypeId: "test-parent-resource-type-id",
};
const testCatalogConfig: CatalogConfig = {
  id: resourceTypeId,
  name: "test-catalog-name",
  description: "test-description-approval-flows",
  approvalFlows: [],
  resourceTypes: [testResourceTypeConfig],
};

describe("Testing canCreateResource", () => {
  describe("checkCanCreateResourceImpl", () => {
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

    const input: CreateResourceInput = {
      catalogId: catalogId,
      resourceTypeId: resourceTypeId,
      inputParams: {},
      requestUserId: requestUserId,
      parentResourceId: parentResourceId,
      approverGroupId: undefined,
      ownerGroupId: undefined,
    };

    it("should return ok with valid input", async () => {
      const expected = structuredClone(input);

      const result = await checkCanCreateResourceImpl(
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

    it("should return ok even if anyoneCanCreate in catalog config is undefined", async () => {
      const canCreateFalseConfig = {
        ...testCatalogConfig,
        resourceTypes: [
          {
            ...testResourceTypeConfig,
            anyoneCanCreate: undefined,
          },
        ],
      };
      const getCatalogConfigProviderWithFalse = vi.fn().mockReturnValue(okAsync(some(canCreateFalseConfig)));

      const result = await checkCanCreateResourceImpl(
        input,
        getCatalogDBProviderSuccess,
        getCatalogConfigProviderWithFalse,
        getResourceDBProviderSuccess,
        getGroupMemberShipProviderSuccess
      );

      if (result.isErr()) {
        throw result.error;
      }

      expect(result.isOk()).toBe(true);
    });

    it("should return error if DB providers return none and anyoneCanCreate in catalog config is undefined", async () => {
      const canCreateFalseConfig = {
        ...testCatalogConfig,
        resourceTypes: [
          {
            ...testResourceTypeConfig,
            anyoneCanCreate: undefined,
          },
        ],
      };
      const getCatalogDBProviderNone = vi.fn().mockReturnValue(okAsync(none));
      const getCatalogConfigProviderWithFalse = vi.fn().mockReturnValue(okAsync(some(canCreateFalseConfig)));
      const getResourceDBProviderNone = vi.fn().mockReturnValue(okAsync(none));

      const result = await checkCanCreateResourceImpl(
        input,
        getCatalogDBProviderNone,
        getCatalogConfigProviderWithFalse,
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
      const result = await checkCanCreateResourceImpl(input, fn1, fn2, fn3, fn4);

      expect(result.isErr()).toBe(true);
    });
  });
});
