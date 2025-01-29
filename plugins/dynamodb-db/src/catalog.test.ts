import { expect, it, describe, beforeAll, afterAll } from "vitest";
import { CatalogInfoOnDB } from "@stamp-lib/stamp-types/models";
import { some, none } from "@stamp-lib/stamp-option";
import { createLogger } from "@stamp-lib/stamp-logger";
import { setImpl, getByIdImpl, listAllImpl, deleteImpl } from "./catalog";

const logger = createLogger("DEBUG", { moduleName: "plugins" });
const id = "test-iam-catalog";
const tableName = `${process.env.DYNAMO_TABLE_PREFIX}-dynamodb-db-Catalog`;
const config = { region: "us-west-2" };

describe("Testing catalog", () => {
  beforeAll(async () => {
    await deleteImpl(logger)(id, tableName, config);
  });
  afterAll(async () => {
    await deleteImpl(logger)(id, tableName, config);
  });

  describe("setImpl", () => {
    it("should successfully set catalog even if ownerGroupId is empty", async () => {
      const catalogInput: CatalogInfoOnDB = {
        id: id,
        ownerGroupId: "",
      };
      const resultAsync = setImpl(logger)(catalogInput, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("should successfully set catalog with valid input", async () => {
      const catalogInput: CatalogInfoOnDB = {
        id: id,
        ownerGroupId: undefined,
      };
      const expected = structuredClone(catalogInput);
      const resultAsync = setImpl(logger)(catalogInput, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(expected);
    });

    it("returns failure result if ID is empty", async () => {
      const catalogInput: CatalogInfoOnDB = {
        id: "",
        ownerGroupId: undefined,
      };
      const resultAsync = setImpl(logger)(catalogInput, tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("getByIdImpl", () => {
    it("should successfully get catalog with valid input", async () => {
      const expected = {
        id: id,
        ownerGroupId: undefined,
      };
      const resultAsync = getByIdImpl(logger)(id, tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(some(expected));
    });

    it("returns none if ID does not exist", async () => {
      const resultAsync = getByIdImpl(logger)("non-existent-id", tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toBe(none);
    });

    it("returns failure result if ID is empty", async () => {
      const resultAsync = getByIdImpl(logger)("", tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("listAllImpl", () => {
    it("should successfully list catalogs with valid input", async () => {
      const resultAsync = listAllImpl(logger)(tableName, config);
      const result = await resultAsync;
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.length).not.toBe(0);
    });
  });

  describe("deleteImpl", () => {
    it("should successfully delete catalog with valid input", async () => {
      const resultAsync = deleteImpl(logger)(id, tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns successful result even if ID does not exist", async () => {
      const resultAsync = deleteImpl(logger)("non-exist-catalog-id", tableName, config);
      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });

    it("returns failure result if ID is empty", async () => {
      const resultAsync = deleteImpl(logger)("", tableName, config);
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });
});
