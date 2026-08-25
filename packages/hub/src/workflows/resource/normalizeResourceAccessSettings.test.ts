import { describe, expect, it } from "vitest";
import { normalizeRequesterGroupIds, normalizeVisibility } from "./normalizeResourceAccessSettings";

const a = "1f10d463-a2fe-c407-2b95-05b561346c8b";
const b = "7c2b9e4d-1a3f-4c5e-9b8a-6d5c4b3a2f1e";

describe("normalizeRequesterGroupIds", () => {
  it("returns undefined for undefined", () => {
    expect(normalizeRequesterGroupIds(undefined)).toBeUndefined();
  });
  it("returns undefined for an empty array", () => {
    expect(normalizeRequesterGroupIds([])).toBeUndefined();
  });
  it("dedupes while keeping order", () => {
    expect(normalizeRequesterGroupIds([a, b, a])).toEqual([a, b]);
  });
});

describe("normalizeVisibility", () => {
  it('returns undefined for undefined and "all"', () => {
    expect(normalizeVisibility(undefined)).toBeUndefined();
    expect(normalizeVisibility("all")).toBeUndefined();
  });
  it('keeps "restricted"', () => {
    expect(normalizeVisibility("restricted")).toBe("restricted");
  });
});
