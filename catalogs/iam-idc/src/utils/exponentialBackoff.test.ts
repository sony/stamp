import { expect, it, describe } from "vitest";
import { exponentialBackoff } from "./exponentialBackoff";

describe("exponentialBackoff", () => {
  it("should return the result when fn succeeds", async () => {
    const fn = () => Promise.resolve("success");
    const shouldRetry = () => false;
    const result = await exponentialBackoff(3, 1000, fn, shouldRetry);
    expect(result).toBe("success");
  });

  it("should retry and return the result when fn fails and there are retries left", async () => {
    let attempt = 0;
    const fn = () => {
      attempt += 1;
      if (attempt !== 4) {
        return Promise.reject("error");
      } else {
        return Promise.resolve("success");
      }
    };
    const shouldRetry = (error: string) => error === "error";
    const result = await exponentialBackoff(5, 1000, fn, shouldRetry);
    expect(result).toBe("success");
  }, 10000);

  it("should return an error when fn fails and there are no retries left", async () => {
    const fn = () => Promise.reject("error");
    const shouldRetry = () => false;
    try {
      await exponentialBackoff(3, 1000, fn, shouldRetry);
    } catch (error) {
      expect(error).toBe("error");
    }
  });
});
