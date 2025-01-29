import { some } from "@stamp-lib/stamp-option";
import { CatalogConfig } from "@stamp-lib/stamp-types/models";
import { describe, expect, it } from "vitest";
import { createApprovalFlowConfigProvider, getApprovalFlowConfig, listApprovalFlowConfig } from "./approvalFlow";
import {
  ApprovalFlowHandler,
  ApprovalRequestValidationOutput,
  ApprovedOutput,
  HandlerError,
  RevokedOutput,
} from "@stamp-lib/stamp-types/catalogInterface/handler";
import { Result } from "neverthrow";

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

describe("getApprovalFlowConfig", () => {
  it("should return some approval flow config when valid catalogId and approvalFlowId are provided", async () => {
    const catalog: CatalogConfig = {
      id: "testCatalogId",
      name: "testCatalogName",
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
      resourceTypes: [],
    };
    const mockCatalogConfigMap = new Map<string, CatalogConfig>([["testCatalogId", catalog]]);
    const result = await getApprovalFlowConfig(mockCatalogConfigMap)("testCatalogId", "testApprovalFlowId");
    expect(result.isOk()).toBe(true);

    expect(result._unsafeUnwrap().isSome()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(
      some({
        id: "testApprovalFlowId",
        catalogId: "testCatalogId",
        name: "testApprovalFlowName",
        description: "testApprovalFlowDescription",
        inputParams: [],
        handlers: testApprovalFlowHandler,
        inputResources: [],
        approver: { approverType: "approvalFlow" },
      })
    );
  });

  it("should return none when catalogConfig is not set", async () => {
    const mockCatalogConfigMap = new Map<string, CatalogConfig>();

    const result = await getApprovalFlowConfig(mockCatalogConfigMap)("invalidCatalog", "flow1");
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().isNone()).toBe(true);
  });

  it("should return none when the specified catalogId does not exist", async () => {
    const catalog: CatalogConfig = {
      id: "testCatalogId",
      name: "testCatalogName",
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
      resourceTypes: [],
    };
    const mockCatalogConfigMap = new Map<string, CatalogConfig>([["testCatalogId", catalog]]);
    const result = await getApprovalFlowConfig(mockCatalogConfigMap)("invalidCatalog", "flow1");
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().isNone()).toBe(true);
  });

  it("should return none when approvalFlowId is not set", async () => {
    const catalog: CatalogConfig = {
      id: "testCatalogId",
      name: "testCatalogName",
      description: "testCatalogDescription",
      approvalFlows: [],
      resourceTypes: [],
    };
    const mockCatalogConfigMap = new Map<string, CatalogConfig>([["testCatalogId", catalog]]);
    const result = await getApprovalFlowConfig(mockCatalogConfigMap)("testCatalogId", "flow1");
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().isNone()).toBe(true);
  });

  it("should return none when the specified approvalFlowId does not exist", async () => {
    const catalog: CatalogConfig = {
      id: "testCatalogId",
      name: "testCatalogName",
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
      resourceTypes: [],
    };
    const mockCatalogConfigMap = new Map<string, CatalogConfig>([["testCatalogId", catalog]]);
    const result = await getApprovalFlowConfig(mockCatalogConfigMap)("testCatalogId", "invalid-flow-id");
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().isNone()).toBe(true);
  });
});

describe("listApprovalFlowConfig", () => {
  it("should return list of approval flows for a valid catalogId", async () => {
    const catalog: CatalogConfig = {
      id: "testCatalogId",
      name: "testCatalogName",
      description: "testCatalogDescription",
      approvalFlows: [
        {
          id: "testApprovalFlowId1",
          name: "testApprovalFlowName1",
          description: "testApprovalFlowDescription1",
          inputParams: [],
          handlers: testApprovalFlowHandler,
          inputResources: [],
          approver: { approverType: "approvalFlow" },
        },
        {
          id: "testApprovalFlowId2",
          name: "testApprovalFlowName2",
          description: "testApprovalFlowDescription2",
          inputParams: [],
          handlers: testApprovalFlowHandler,
          inputResources: [],
          approver: { approverType: "approvalFlow" },
        },
      ],
      resourceTypes: [],
    };
    const mockCatalogConfigMap = new Map<string, CatalogConfig>([["testCatalogId", catalog]]);
    const result = await listApprovalFlowConfig(mockCatalogConfigMap)("testCatalogId");
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([
      {
        id: "testApprovalFlowId1",
        catalogId: "testCatalogId",
        name: "testApprovalFlowName1",
        description: "testApprovalFlowDescription1",
        inputParams: [],
        handlers: testApprovalFlowHandler,
        inputResources: [],
        approver: { approverType: "approvalFlow" },
      },
      {
        id: "testApprovalFlowId2",
        catalogId: "testCatalogId",
        name: "testApprovalFlowName2",
        description: "testApprovalFlowDescription2",
        inputParams: [],
        handlers: testApprovalFlowHandler,
        inputResources: [],
        approver: { approverType: "approvalFlow" },
      },
    ]);
  });

  it("should list all approval flows for a valid catalogId", async () => {
    const catalog: CatalogConfig = {
      id: "testCatalogId",
      name: "testCatalogName",
      description: "testCatalogDescription",
      approvalFlows: [
        {
          id: "testApprovalFlowId1",
          name: "testApprovalFlowName1",
          description: "testApprovalFlowDescription1",
          inputParams: [],
          handlers: testApprovalFlowHandler,
          inputResources: [],
          approver: { approverType: "approvalFlow" },
        },
        {
          id: "testApprovalFlowId2",
          name: "testApprovalFlowName2",
          description: "testApprovalFlowDescription2",
          inputParams: [],
          handlers: testApprovalFlowHandler,
          inputResources: [],
          approver: { approverType: "approvalFlow" },
        },
      ],
      resourceTypes: [],
    };
    const mockCatalogConfigMap = new Map<string, CatalogConfig>([["testCatalogId", catalog]]);
    const result = await listApprovalFlowConfig(mockCatalogConfigMap)("testCatalogId");
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([
      {
        id: "testApprovalFlowId1",
        catalogId: "testCatalogId",
        name: "testApprovalFlowName1",
        description: "testApprovalFlowDescription1",
        inputParams: [],
        handlers: testApprovalFlowHandler,
        inputResources: [],
        approver: { approverType: "approvalFlow" },
      },
      {
        id: "testApprovalFlowId2",
        catalogId: "testCatalogId",
        name: "testApprovalFlowName2",
        description: "testApprovalFlowDescription2",
        inputParams: [],
        handlers: testApprovalFlowHandler,
        inputResources: [],
        approver: { approverType: "approvalFlow" },
      },
    ]);
  });

  it("should return none when catalogConfig is not set", async () => {
    const mockCatalogConfigMap = new Map<string, CatalogConfig>();
    const result = await listApprovalFlowConfig(mockCatalogConfigMap)("invalidCatalog");
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([]);
  });

  it("should return none when the specified catalogId does not exist", async () => {
    const catalog: CatalogConfig = {
      id: "testCatalogId",
      name: "testCatalogName",
      description: "testCatalogDescription",
      approvalFlows: [
        {
          id: "testApprovalFlowId1",
          name: "testApprovalFlowName1",
          description: "testApprovalFlowDescription1",
          inputParams: [],
          handlers: testApprovalFlowHandler,
          inputResources: [],
          approver: { approverType: "approvalFlow" },
        },
        {
          id: "testApprovalFlowId2",
          name: "testApprovalFlowName2",
          description: "testApprovalFlowDescription2",
          inputParams: [],
          handlers: testApprovalFlowHandler,
          inputResources: [],
          approver: { approverType: "approvalFlow" },
        },
      ],
      resourceTypes: [],
    };
    const mockCatalogConfigMap = new Map<string, CatalogConfig>([["testCatalogId", catalog]]);
    const result = await listApprovalFlowConfig(mockCatalogConfigMap)("invalidCatalog");
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([]);
  });
});

describe("createApprovalFlowConfigProvider", () => {
  it("should return approval flow config provider", () => {
    const catalog: CatalogConfig = {
      id: "testCatalogId",
      name: "testCatalogName",
      description: "testCatalogDescription",
      approvalFlows: [
        {
          id: "testApprovalFlowId1",
          name: "testApprovalFlowName1",
          description: "testApprovalFlowDescription1",
          inputParams: [],
          handlers: testApprovalFlowHandler,
          inputResources: [],
          approver: { approverType: "approvalFlow" },
        },
        {
          id: "testApprovalFlowId2",
          name: "testApprovalFlowName2",
          description: "testApprovalFlowDescription2",
          inputParams: [],
          handlers: testApprovalFlowHandler,
          inputResources: [],
          approver: { approverType: "approvalFlow" },
        },
      ],
      resourceTypes: [],
    };
    const mockCatalogConfigMap = new Map<string, CatalogConfig>([["testCatalogId", catalog]]);
    const approvalFlowConfigProvider = createApprovalFlowConfigProvider(mockCatalogConfigMap);
    expect(approvalFlowConfigProvider.getInfo).toBeDefined();
    expect(approvalFlowConfigProvider.listInfoByCatalogId).toBeDefined();
  });
});
