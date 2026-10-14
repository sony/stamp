import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { HandlerError, ListResourceAuditItemOutput, ResourceHandlers } from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { err, ok, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { ListResourceAuditItemInput } from "./input";
import { listResourceAuditItem } from "./listResourceAuditItem";

const catalogId = "test-catalog-id";
const resourceTypeId = "test-resource-type-id";
const resourceId = "test-resource-id";
const requestUserId = "47f29c51-204c-09f6-2069-f3df073568c7"; // The uuid is meaningless and was generated for testing.
const logger = createLogger("DEBUG", { moduleName: "hub" });

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
    return ok({
      auditItems: [
        {
          values: ["test-role-admin"],
          type: "permission",
          name: "test-user-name",
        },
      ],
    });
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
};
const testCatalogConfig: CatalogConfig = {
  id: resourceTypeId,
  name: "test-catalog-name",
  description: "test-description-approval-flows",
  approvalFlows: [],
  resourceTypes: [testResourceTypeConfig],
};

// The resource has no hub-side row, so it is not restricted and no visibility lookups happen.
const getResourceDBProvider = vi.fn().mockReturnValue(okAsync(none));
const getCatalogDBProvider = vi.fn().mockReturnValue(okAsync(none));
const listGroupMemberShipByUser = vi.fn().mockReturnValue(okAsync({ items: [] }));
const providersWith = (getCatalogConfigProvider: ReturnType<typeof vi.fn>) => ({
  getCatalogConfigProvider,
  getResourceDBProvider,
  getCatalogDBProvider,
  listGroupMemberShipByUser,
});

describe("Testing listResourceAuditItem", () => {
  it("should list resource audit item with valid input", async () => {
    const getCatalogConfigSuccess = vi.fn().mockReturnValue(okAsync(some(testCatalogConfig)));
    const input: ListResourceAuditItemInput = {
      catalogId: catalogId,
      resourceTypeId: resourceTypeId,
      resourceId: resourceId,
      requestUserId: requestUserId,
      paginationToken: undefined,
      limit: undefined,
    };
    const expected: ListResourceAuditItemOutput = {
      auditItems: [
        {
          values: ["test-role-admin"],
          type: "permission",
          name: "test-user-name",
        },
      ],
      paginationToken: undefined,
    };
    const result = await listResourceAuditItem(logger, providersWith(getCatalogConfigSuccess))(input);
    if (result.isErr()) {
      throw result.error;
    }
    expect(getCatalogConfigSuccess.mock.calls.length).toBe(1);
    expect(getCatalogConfigSuccess.mock.calls[0][0]).toStrictEqual(input.catalogId);
    expect(result.value).toEqual(expected);
  });

  it("returns failure result if resource types of catalog config is empty", async () => {
    const getCatalogConfigError = vi.fn().mockReturnValue(
      okAsync(
        some({
          id: resourceTypeId,
          name: "test-catalog-name",
          description: "test-description-approval-flows",
          approvalFlows: [],
          resourceTypes: [],
        })
      )
    );
    const input: ListResourceAuditItemInput = {
      catalogId: catalogId,
      resourceTypeId: resourceTypeId,
      resourceId: resourceId,
      requestUserId: requestUserId,
      paginationToken: undefined,
      limit: undefined,
    };
    const result = await listResourceAuditItem(logger, providersWith(getCatalogConfigError))(input);
    expect(result.isErr()).toBe(true);
  });

  it("returns failure result if handler returns an error", async () => {
    const listAuditItemHandlerError = vi.fn().mockReturnValue(err(new HandlerError("failed to list audit item", "INTERNAL_SERVER_ERROR")));
    const testHandlerError = {
      ...testResourceTypeHandler,
      listResourceAuditItem: listAuditItemHandlerError,
    };
    const getCatalogConfig = vi.fn().mockReturnValue(
      okAsync(
        some({
          id: resourceTypeId,
          name: "test-catalog-name",
          description: "test-description-approval-flows",
          approvalFlows: [],
          resourceTypes: [
            {
              ...testResourceTypeConfig,
              handlers: testHandlerError,
            },
          ],
        })
      )
    );
    const input: ListResourceAuditItemInput = {
      catalogId: catalogId,
      resourceTypeId: resourceTypeId,
      resourceId: resourceId,
      requestUserId: requestUserId,
      paginationToken: undefined,
      limit: undefined,
    };
    const result = await listResourceAuditItem(logger, providersWith(getCatalogConfig))(input);
    expect(result.isErr()).toBe(true);
  });

  it.each([
    [
      "catalog ID is empty",
      {
        catalogId: "",
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        requestUserId: requestUserId,
      },
    ],
    [
      "resource type ID is empty",
      {
        catalogId: catalogId,
        resourceTypeId: "",
        resourceId: resourceId,
        requestUserId: requestUserId,
      },
    ],
    [
      "request user ID is empty",
      {
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        requestUserId: "",
      },
    ],
    [
      "resource ID is empty",
      {
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        resourceId: "",
        requestUserId: requestUserId,
      },
    ],
    [
      "request user ID is invalid",
      {
        catalogId: catalogId,
        resourceTypeId: resourceTypeId,
        resourceId: resourceId,
        requestUserId: "1234567890",
      },
    ],
  ])("returns failure result", async (key, input) => {
    const getCatalogConfigSuccess = vi.fn().mockReturnValue(okAsync(some(testCatalogConfig)));
    const result = await listResourceAuditItem(logger, providersWith(getCatalogConfigSuccess))(input);
    expect(result.isErr()).toBe(true);
  });
  describe("visibility", () => {
    const ownerGroupId = "96fc6a4c-b5d3-8c2b-0307-165168a023cd";
    const input: ListResourceAuditItemInput = { catalogId, resourceTypeId, resourceId, requestUserId };
    const restricted = vi.fn().mockReturnValue(okAsync(some({ id: resourceId, catalogId, resourceTypeId, ownerGroupId, visibility: "restricted" })));
    const membership = (groups: Array<string>) =>
      vi.fn().mockReturnValue(okAsync({ items: groups.map((groupId) => ({ groupId, userId: requestUserId, role: "member", createdAt: "", updatedAt: "" })) }));

    it("returns FORBIDDEN for a restricted resource when the user is unrelated", async () => {
      const result = await listResourceAuditItem(logger, {
        getCatalogConfigProvider: vi.fn().mockReturnValue(okAsync(some(testCatalogConfig))),
        getResourceDBProvider: restricted,
        getCatalogDBProvider: vi.fn().mockReturnValue(okAsync(none)),
        listGroupMemberShipByUser: membership([]),
      })(input);
      expect(result._unsafeUnwrapErr().code).toBe("FORBIDDEN");
    });

    it("lists audit items for an owner group member", async () => {
      const result = await listResourceAuditItem(logger, {
        getCatalogConfigProvider: vi.fn().mockReturnValue(okAsync(some(testCatalogConfig))),
        getResourceDBProvider: restricted,
        getCatalogDBProvider: vi.fn().mockReturnValue(okAsync(none)),
        listGroupMemberShipByUser: membership([ownerGroupId]),
      })(input);
      expect(result._unsafeUnwrap().auditItems.length).toBe(1);
    });
  });
});
