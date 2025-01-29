import { describe, expect, it } from "vitest";
import {
  ConvertRepositoryRolesToItemsInput,
  ConvertRepositoryRolesToItemsOutput,
  convertRepositoryRolesToAuditItems,
} from "./convertRepositoryRolesToAuditItems";

describe("Testing mapResultsToItems function for GitHub IAM Role", () => {
  describe("listResourceAuditItemHandler", () => {
    it("should correctly convert valid repository roles to audit items", async () => {
      const input: ConvertRepositoryRolesToItemsInput[] = [
        {
          roleName: "role1",
          value: "value1",
          isJumpIamRole: false,
        },
        {
          roleName: "role2",
          value: "value2",
          isJumpIamRole: false,
        },
        {
          roleName: "role2",
          value: "value3",
          isJumpIamRole: false,
        },
        {
          roleName: "role3",
          value: "value4",
          isJumpIamRole: true,
        },
        {
          roleName: "role4",
          value: "value5",
          isJumpIamRole: true,
        },
        {
          roleName: "role4",
          value: "value6",
          isJumpIamRole: true,
        },
      ];
      const expected: ConvertRepositoryRolesToItemsOutput = {
        auditItems: [
          {
            type: "permission",
            name: "role1 IAM Role",
            values: ["value1 GitHub IAM Role"],
          },
          {
            type: "permission",
            name: "role2 IAM Role",
            values: ["value2 GitHub IAM Role", "value3 GitHub IAM Role"],
          },
          {
            type: "permission",
            name: "role3 IAM Role",
            values: ["value4 Jump IAM Role"],
          },
          {
            type: "permission",
            name: "role4 IAM Role",
            values: ["value5 Jump IAM Role", "value6 Jump IAM Role"],
          },
        ],
      };
      const result = convertRepositoryRolesToAuditItems(input);
      if (result.isErr()) {
        throw result.error;
      }
      console.log("result.value.auditItems", result.value.auditItems);
      expect(Array.isArray(result.value.auditItems)).toBe(true);
      result.value.auditItems.forEach((value) => {
        expect(Array.isArray(value.values)).toBe(true);
      });
      expect(result.value.auditItems).toHaveLength(expected.auditItems.length);
      for (let i = 0; i < result.value.auditItems.length; i++) {
        expect(result.value.auditItems[i].type).toEqual(expected.auditItems[i].type);
        expect(result.value.auditItems[i].name).toEqual(expected.auditItems[i].name);
        expect(result.value.auditItems[i].values.sort()).toEqual(expected.auditItems[i].values.sort());
      }
    });

    it("should return empty audit items when input is empty", async () => {
      const input: ConvertRepositoryRolesToItemsInput[] = [];
      const expected: ConvertRepositoryRolesToItemsOutput = {
        auditItems: [],
      };
      const result = convertRepositoryRolesToAuditItems(input);
      if (result.isErr()) {
        throw result.error;
      }
      console.log("result.value.auditItems", result.value.auditItems);
      expect(Array.isArray(result.value.auditItems)).toBe(true);
      result.value.auditItems.forEach((value) => {
        expect(Array.isArray(value.values)).toBe(true);
      });
      expect(result.value.auditItems).toHaveLength(expected.auditItems.length);
    });

    it("should handle repository roles with empty roleName or value correctly", async () => {
      const input: ConvertRepositoryRolesToItemsInput[] = [
        {
          roleName: "",
          value: "value1",
          isJumpIamRole: false,
        },
        {
          roleName: "role1",
          value: "",
          isJumpIamRole: true,
        },
      ];
      const expected: ConvertRepositoryRolesToItemsOutput = {
        auditItems: [
          {
            type: "permission",
            name: " IAM Role",
            values: ["value1 GitHub IAM Role"],
          },
          {
            type: "permission",
            name: "role1 IAM Role",
            values: [" Jump IAM Role"],
          },
        ],
      };
      const result = convertRepositoryRolesToAuditItems(input);
      if (result.isErr()) {
        throw result.error;
      }
      console.log("result.value.auditItems", result.value.auditItems);
      expect(Array.isArray(result.value.auditItems)).toBe(true);
      result.value.auditItems.forEach((value) => {
        expect(Array.isArray(value.values)).toBe(true);
      });
      expect(result.value.auditItems).toHaveLength(expected.auditItems.length);
      for (let i = 0; i < result.value.auditItems.length; i++) {
        expect(result.value.auditItems[i].type).toEqual(expected.auditItems[i].type);
        expect(result.value.auditItems[i].name).toEqual(expected.auditItems[i].name);
        expect(result.value.auditItems[i].values.sort()).toEqual(expected.auditItems[i].values.sort());
      }
    });
  });
});
