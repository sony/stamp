import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    watch: false,
    hookTimeout: 20000,
    testTimeout: 40000,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // Limit concurrency to prevent IAM Identity Center API throttling
    // and ensure test isolation for permission/group creation operations
    maxConcurrency: 1,
    pool: "threads",
  },
});
