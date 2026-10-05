import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      reporter: ["text"],
      enabled: true,
      include: ["**/src/**/*.ts"],
      exclude: [...defaultExclude, "**/*.test.ts", "hub/src/route/**", "types/**"], // Excluding files in 'hub/src/route' from coverage measurement as they contain TRPC routing definitions and are not tested.
    },
  },
});
