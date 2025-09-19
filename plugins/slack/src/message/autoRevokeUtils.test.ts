import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// We'll test the utility functions by extracting them
// Parse ISO 8601 duration format (e.g., "P7D" for 7 days, "PT12H" for 12 hours, "P1DT2H" for 1 day 2 hours)
const parseAutoRevokeDuration = (duration: string): { days: number; hours: number } | null => {
  const durationMatch = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/);
  if (durationMatch) {
    const days = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
    const hours = durationMatch[2] ? parseInt(durationMatch[2]) : 0;
    return { days, hours };
  }
  return null;
};

// Calculate when access would be revoked if approved now
const calculateAutoRevokeDate = (autoRevokeDuration: string): string | null => {
  const parsed = parseAutoRevokeDuration(autoRevokeDuration);
  if (!parsed) {
    return null;
  }

  const { days, hours } = parsed;
  const revokeTime = new Date();
  revokeTime.setDate(revokeTime.getDate() + days);
  revokeTime.setHours(revokeTime.getHours() + hours);

  // Format the date for display in Slack (include timezone for clarity)
  return revokeTime.toLocaleString("en-US", { 
    timeZoneName: "short",
    year: "numeric",
    month: "2-digit", 
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

describe("Auto-revoke utilities", () => {
  beforeEach(() => {
    // Mock the current date to a fixed time for consistent testing
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
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
      expect(result).toContain("01/22/2024"); // 7 days from 01/15/2024
      expect(result).toContain("10:00"); // Same time
    });

    it("should calculate correct date for PT12H", () => {
      const result = calculateAutoRevokeDate("PT12H");
      expect(result).toContain("01/15/2024"); // Same day
      expect(result).toContain("10:00 PM"); // 12 hours later (22:00)
    });

    it("should calculate correct date for P1DT2H", () => {
      const result = calculateAutoRevokeDate("P1DT2H");
      expect(result).toContain("01/16/2024"); // 1 day later
      expect(result).toContain("12:00 PM"); // 2 hours later (12:00)
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