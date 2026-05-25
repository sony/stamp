import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    watch: false,
    // Integration / handler tests perform several sequential AWS calls in
    // beforeAll/afterAll (DynamoDB cleanup + IAM role create/delete). The
    // default 10s hookTimeout is not enough; bumping globally avoids
    // sprinkling per-hook timeouts across every file.
    hookTimeout: 120_000,
    testTimeout: 300_000,
    // Several integration files share the same IAM role names to exercise
    // realistic flows. Running them in parallel causes EntityAlreadyExists
    // / NoSuchEntity races on AWS resources, so we serialize file execution.
    fileParallelism: false,
  },
});
