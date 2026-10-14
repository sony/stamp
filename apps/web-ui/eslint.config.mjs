// ESLint flat config (ESLint 9 / Next 16). `next lint` was removed in Next 16, so run `npm run lint` (eslint .) instead.
import js from "@eslint/js";
import { globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

const config = [
  globalIgnores(["**/.next/**", "**/node_modules/**", "custom-server.js", "playwright-report/**", "test-results/**", "next-env.d.ts"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextCoreWebVitals,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      // React Compiler advisories introduced with eslint-config-next 16. Existing dialogs reset/fetch state in effects;
      // report them as warnings until they are refactored so that `npm run lint` stays actionable.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  {
    // CommonJS config files
    files: ["*.js", "*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default config;
