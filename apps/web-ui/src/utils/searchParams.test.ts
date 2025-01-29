import { describe, it, expect } from "vitest";
import { getParamAsString } from "./searchParams";

describe("getParamAsString", () => {
  it("should return the string value for a given key", () => {
    const searchParams = { name: "John Doe" };
    const result = getParamAsString(searchParams, "name");
    expect(result).toBe("John Doe");
  });

  it("should return undefined for a key with array value", () => {
    const searchParams = { colors: ["red", "blue"] };
    const result = getParamAsString(searchParams, "colors");
    expect(result).toBeUndefined();
  });

  it("should return undefined for a non-existing key", () => {
    const searchParams = { name: "Jane Doe" };
    const result = getParamAsString(searchParams, "age");
    expect(result).toBeUndefined();
  });

  it("should handle keys with undefined value", () => {
    const searchParams = { name: undefined };
    const result = getParamAsString(searchParams, "name");
    expect(result).toBeUndefined();
  });
});
