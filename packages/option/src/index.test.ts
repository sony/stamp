import { it, expect, describe } from "vitest";
import { some, none, Option } from "./index";

describe("Some", () => {
  it("should create a Some instance with a value", () => {
    const option = some(123);
    expect(option.value).toBe(123);
  });

  it("should return true for isSome()", () => {
    const option = some(123);
    expect(option.isSome()).toBe(true);
  });

  it("should return false for isNone()", () => {
    const option = some(123);
    expect(option.isNone()).toBe(false);
  });

  it("should unwrap the value with unwrapOr()", () => {
    const option = some(123);
    expect(option.unwrapOr()).toBe(123);
  });

  it("should map the value", () => {
    const option = some(123);
    const mapped = option.map((v) => v * 2);
    expect(mapped.isSome()).toBe(true);
    if (mapped.isSome()) {
      expect(mapped.value).toBe(123 * 2);
    }
  });

  it("should match the value", () => {
    const option = some(123);
    const matched = option.match((v) => v * 2);
    expect(matched).toBe(123 * 2);
  });
});

describe("None", () => {
  it("should return false for isSome()", () => {
    expect(none.isSome()).toBe(false);
  });

  it("should return true for isNone()", () => {
    expect(none.isNone()).toBe(true);
  });

  it("should unwrap the default value with unwrapOr()", () => {
    expect((none as Option<number>).unwrapOr(123)).toBe(123);
  });

  it("should not map the value", () => {
    const mapped = none.map((v) => v * 2);
    expect(mapped.isNone()).toBe(true);
  });

  it("should match the value", () => {
    const matched = none.match(
      (v) => v * 2,
      () => 123
    );
    expect(matched).toBe(123);
  });
});
