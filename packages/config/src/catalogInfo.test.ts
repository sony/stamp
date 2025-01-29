import { none, Option, some } from "@stamp-lib/stamp-option";
import {
  ApprovalFlowHandler,
  ApprovalRequestValidationOutput,
  ApprovedOutput,
  HandlerError,
  ListResourceAuditItemOutput,
  ListResourcesOutput,
  ResourceHandlers,
  ResourceOutput,
  RevokedOutput,
} from "@stamp-lib/stamp-types/catalogInterface/handler";
import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { createCatalogInfoOnConfigProvider } from "./catalogInfo";

const testApprovalFlowHandler: ApprovalFlowHandler = {
  approvalRequestValidation: function (): Promise<Result<ApprovalRequestValidationOutput, HandlerError>> {
    throw new Error("Function not implemented.");
  },
  approved: function (): Promise<Result<ApprovedOutput, HandlerError>> {
    throw new Error("Function not implemented.");
  },
  revoked: function (): Promise<Result<RevokedOutput, HandlerError>> {
    throw new Error("Function not implemented.");
  },
};

const testResourceHandler: ResourceHandlers = {
  createResource: function (): Promise<Result<ResourceOutput, HandlerError>> {
    throw new Error("Function not implemented.");
  },
  deleteResource: function (): Promise<Result<void, HandlerError>> {
    throw new Error("Function not implemented.");
  },
  getResource: function (): Promise<Result<Option<ResourceOutput>, HandlerError>> {
    throw new Error("Function not implemented.");
  },
  updateResource: function (): Promise<Result<ResourceOutput, HandlerError>> {
    throw new Error("Function not implemented.");
  },
  listResources: function (): Promise<Result<ListResourcesOutput, HandlerError>> {
    throw new Error("Function not implemented.");
  },
  listResourceAuditItem: function (): Promise<Result<ListResourceAuditItemOutput, HandlerError>> {
    throw new Error("Function not implemented.");
  },
};

describe("CatalogInfoOnConfigProvider", () => {
  describe("getCatalogInfoOnConfig", () => {
    it("should return some catalog info when config exists", async () => {
      const catalog: CatalogConfig = {
        id: "1",
        name: "Catalog1",
        description: "testCatalogDescription",
        approvalFlows: [
          {
            id: "testApprovalFlowId",
            name: "testApprovalFlowName",
            description: "testApprovalFlowDescription",
            inputParams: [],
            handlers: testApprovalFlowHandler,
            inputResources: [],
            approver: { approverType: "approvalFlow" },
          },
        ],
        resourceTypes: [
          {
            id: "testResourceType",
            name: "testResourceType",
            description: "ResourceTypeDescription",
            handlers: testResourceHandler,
            createParams: [],
            infoParams: [],
            isCreatable: false,
            isUpdatable: false,
            isDeletable: false,
            ownerManagement: false,
            approverManagement: false,
          },
        ],
      };
      const mockCatalogConfigMap = new Map<string, Readonly<CatalogConfig>>([["1", catalog]]);
      const provider = createCatalogInfoOnConfigProvider(mockCatalogConfigMap);

      const result = await provider.get("1");

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(
        some({
          id: "1",
          name: "Catalog1",
          description: "testCatalogDescription",
          approvalFlowIds: ["testApprovalFlowId"],
          resourceTypeIds: ["testResourceType"],
        })
      );
    });

    it("should return none when config does not exist", async () => {
      const mockCatalogConfigMap = new Map<string, Readonly<CatalogConfig>>();
      const provider = createCatalogInfoOnConfigProvider(mockCatalogConfigMap);

      const result = await provider.get("non-existent");

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(none);
    });
  });

  describe("listCatalogInfoOnConfig", () => {
    it("should return all catalog info", async () => {
      const catalog1: CatalogConfig = {
        id: "1",
        name: "Catalog1",
        description: "testCatalogDescription",
        approvalFlows: [
          {
            id: "testApprovalFlowId",
            name: "testApprovalFlowName",
            description: "testApprovalFlowDescription",
            inputParams: [],
            handlers: testApprovalFlowHandler,
            inputResources: [],
            approver: { approverType: "approvalFlow" },
          },
        ],

        resourceTypes: [
          {
            id: "testResourceType",
            name: "testResourceType",
            description: "ResourceTypeDescription",
            handlers: testResourceHandler,
            createParams: [],
            infoParams: [],
            isCreatable: false,
            isUpdatable: false,
            isDeletable: false,
            ownerManagement: false,
            approverManagement: false,
          },
        ],
      };
      const catalog2: CatalogConfig = {
        id: "2",
        name: "Catalog2",
        description: "testCatalogDescription",
        approvalFlows: [
          {
            id: "testApprovalFlowId",
            name: "testApprovalFlowName",
            description: "testApprovalFlowDescription",
            inputParams: [],
            handlers: testApprovalFlowHandler,
            inputResources: [],
            approver: { approverType: "approvalFlow" },
          },
        ],
        resourceTypes: [
          {
            id: "testResourceType",
            name: "testResourceType",
            description: "ResourceTypeDescription",
            handlers: testResourceHandler,
            createParams: [],
            infoParams: [],
            isCreatable: false,
            isUpdatable: false,
            isDeletable: false,
            ownerManagement: false,
            approverManagement: false,
          },
        ],
      };
      const mockCatalogConfigMap = new Map<string, Readonly<CatalogConfig>>([
        ["1", catalog1],
        ["2", catalog2],
      ]);
      const provider = createCatalogInfoOnConfigProvider(mockCatalogConfigMap);

      const result = await provider.list();

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual([
        {
          id: "1",
          name: "Catalog1",
          description: "testCatalogDescription",
          approvalFlowIds: ["testApprovalFlowId"],
          resourceTypeIds: ["testResourceType"],
        },
        {
          id: "2",
          name: "Catalog2",
          description: "testCatalogDescription",
          approvalFlowIds: ["testApprovalFlowId"],
          resourceTypeIds: ["testResourceType"],
        },
      ]);
    });

    it("should return empty array when no catalog exists", async () => {
      const mockCatalogConfigMap = new Map<string, Readonly<CatalogConfig>>();
      const provider = createCatalogInfoOnConfigProvider(mockCatalogConfigMap);

      const result = await provider.list();

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual([]);
    });
  });
});

describe("createCatalogConfigProvider", () => {
  it("should return create catalog config provider", () => {
    const catalog: CatalogConfig = {
      id: "1",
      name: "Catalog1",
      description: "testCatalogDescription",
      approvalFlows: [
        {
          id: "testApprovalFlowId",
          name: "testApprovalFlowName",
          description: "testApprovalFlowDescription",
          inputParams: [],
          handlers: testApprovalFlowHandler,
          inputResources: [],
          approver: { approverType: "approvalFlow" },
        },
      ],
      resourceTypes: [
        {
          id: "testResourceType",
          name: "testResourceType",
          description: "ResourceTypeDescription",
          handlers: testResourceHandler,
          createParams: [],
          infoParams: [],
          isCreatable: false,
          isUpdatable: false,
          isDeletable: false,
          ownerManagement: false,
          approverManagement: false,
        },
      ],
    };
    const mockCatalogConfigMap = new Map<string, Readonly<CatalogConfig>>([["1", catalog]]);

    const provider = createCatalogInfoOnConfigProvider(mockCatalogConfigMap);

    expect(provider).toBeDefined();
  });
});
