import { createLogger } from "@stamp-lib/stamp-logger";
import { none, some } from "@stamp-lib/stamp-option";
import { ApprovalFlowInfoOnDB } from "@stamp-lib/stamp-types/models";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteImpl, getByIdImpl, listByCatalogIdImpl, setImpl } from "./approvalFlow";

const logger = createLogger("DEBUG", { moduleName: "plugins" });
const approvalFlowId = "test-approval-flow-id";
const catalogId = "test-catalog-id";
const tableName = `${process.env.DYNAMO_TABLE_PREFIX}-dynamodb-db-ApprovalFlow`;
const config = { region: "us-west-2" };

describe("Testing approvalFlow", () => {
  beforeAll(async () => {
    await deleteImpl(logger)(catalogId, approvalFlowId, tableName, config);
  });
  afterAll(async () => {
    await deleteImpl(logger)(catalogId, approvalFlowId, tableName, config);
  });

  describe("setImpl", () => {
    it("should successfully set approval flow even if approver group ID is empty", async () => {
      const approvalFlow: ApprovalFlowInfoOnDB = {
        id: approvalFlowId,
        catalogId: catalogId,
        approverGroupId: "",
      };
      const resultAsync = setImpl(logger)(approvalFlow, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("should successfully set approval flow with valid input", async () => {
      const approvalFlowInput: ApprovalFlowInfoOnDB = {
        id: approvalFlowId,
        catalogId: catalogId,
        approverGroupId: undefined,
      };
      const expected = structuredClone(approvalFlowInput);
      const resultAsync = setImpl(logger)(approvalFlowInput, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it.each([
      [
        "ID is empty",
        {
          id: "",
          catalogId: catalogId,
          approverGroupId: undefined,
        },
      ],
      [
        "catalog ID is empty",
        {
          id: approvalFlowId,
          catalogId: "",
          approverGroupId: undefined,
        },
      ],
    ])("returns failure result", async (key, approvalFlow) => {
      const resultAsync = setImpl(logger)(approvalFlow, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("getByIdImpl", () => {
    it("should successfully get approval flow with valid input", async () => {
      const expected = {
        id: approvalFlowId,
        catalogId: catalogId,
        approverGroupId: undefined,
      };
      const resultAsync = getByIdImpl(logger)(catalogId, approvalFlowId, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("returns none if catalog ID does not exist", async () => {
      const resultAsync = getByIdImpl(logger)("non-existent-catalog-id", approvalFlowId, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns none if approval flow ID does not exist", async () => {
      const resultAsync = getByIdImpl(logger)(catalogId, "non-existent-approval-id", tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it.each([
      ["catalog ID is empty", "", approvalFlowId, tableName],
      ["approval flow ID is empty", catalogId, "", tableName],
    ])("returns failure result", async (key, catalogId, approvalFlowId) => {
      const resultAsync = getByIdImpl(logger)(catalogId, approvalFlowId, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listByCatalogIdImpl", () => {
    it("should successfully list approval flows with valid input", async () => {
      const resultAsync = listByCatalogIdImpl(logger)(catalogId, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.length).not.toBe(0);
    });

    it("returns successful result even if catalog ID does not exist", async () => {
      const resultAsync = listByCatalogIdImpl(logger)("non-existent-catalog-id", tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if catalog ID is empty", async () => {
      const resultAsync = listByCatalogIdImpl(logger)("", tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("deleteImpl", () => {
    it("should successfully delete approval flow with valid input", async () => {
      const resultAsync = deleteImpl(logger)(catalogId, approvalFlowId, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if catalog ID does not exist", async () => {
      const resultAsync = deleteImpl(logger)("non-exist-catalog-id", approvalFlowId, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if approval flow ID does not exist", async () => {
      const resultAsync = deleteImpl(logger)(catalogId, "non-exist-approval-id", tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it.each([
      ["catalog ID is empty", "", approvalFlowId, tableName],
      ["approval ID is empty", catalogId, "", tableName],
    ])("returns failure result", async (key, catalogId, approvalFlowId) => {
      const resultAsync = deleteImpl(logger)(catalogId, approvalFlowId, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
