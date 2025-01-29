module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  plugins: ["@typescript-eslint", "vitest", "neverthrow"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:vitest/recommended"],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "vitest/consistent-test-it": ["error", { fn: "it" }],
    "vitest/require-top-level-describe": ["error"],
    // "neverthrow/must-use-result": "error",
  },
};
