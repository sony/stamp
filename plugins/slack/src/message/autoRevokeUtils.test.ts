import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { parseAutoRevokeDuration, calculateAutoRevokeDate } from "./autoRevokeUtils";

describe("Auto-revoke utilities", () => {
  beforeEach(() => {
    // Mock the current date to a fixed time for consistent testing
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("parseAutoRevokeDuration", () => {
    it("should parse P7D correctly", () => {
      const result = parseAutoRevokeDuration("P7D");
      expect(result).toEqual({ days: 7, hours: 0 });
    });

    it("should parse PT12H correctly", () => {
      const result = parseAutoRevokeDuration("PT12H");
      expect(result).toEqual({ days: 0, hours: 12 });
    });

    it("should parse P1DT2H correctly", () => {
      const result = parseAutoRevokeDuration("P1DT2H");
      expect(result).toEqual({ days: 1, hours: 2 });
    });

    it("should return null for invalid format", () => {
      const result = parseAutoRevokeDuration("invalid");
      expect(result).toBeNull();
    });

    it("should handle P0D correctly", () => {
      const result = parseAutoRevokeDuration("P0D");
      expect(result).toEqual({ days: 0, hours: 0 });
    });
  });

  describe("calculateAutoRevokeDate", () => {
    it("should calculate correct date for P7D", () => {
      const result = calculateAutoRevokeDate("P7D");
      expect(result).not.toBeNull();
      // Parse the result back to a Date to verify calculation
      const resultDate = new Date(result!);
      const expectedDate = new Date("2024-01-15T10:00:00Z");
      expectedDate.setDate(expectedDate.getDate() + 7);

      expect(resultDate.getTime()).toBe(expectedDate.getTime());
    });

    it("should calculate correct date for PT12H", () => {
      const result = calculateAutoRevokeDate("PT12H");
      expect(result).not.toBeNull();
      // Parse the result back to a Date to verify calculation
      const resultDate = new Date(result!);
      const expectedDate = new Date("2024-01-15T10:00:00Z");
      expectedDate.setHours(expectedDate.getHours() + 12);

      expect(resultDate.getTime()).toBe(expectedDate.getTime());
    });

    it("should calculate correct date for P1DT2H", () => {
      const result = calculateAutoRevokeDate("P1DT2H");
      expect(result).not.toBeNull();
      // Parse the result back to a Date to verify calculation
      const resultDate = new Date(result!);
      const expectedDate = new Date("2024-01-15T10:00:00Z");
      expectedDate.setDate(expectedDate.getDate() + 1);
      expectedDate.setHours(expectedDate.getHours() + 2);

      expect(resultDate.getTime()).toBe(expectedDate.getTime());
    });

    it("should return null for invalid duration", () => {
      const result = calculateAutoRevokeDate("invalid");
      expect(result).toBeNull();
    });

    it("should include timezone information", () => {
      const result = calculateAutoRevokeDate("P1D");
      expect(result).toMatch(/UTC|GMT/); // Should include timezone
    });
  });
});
