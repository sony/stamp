# Copilot Instructions: Functional Programming & Testing Guidelines for TypeScript

## Functional Programming Principles

- **Embrace Functional Programming**: Write code in a functional style wherever practical, leveraging TypeScript's type system for safety and clarity.
- **Pure Functions**: Prefer pure functions—functions that do not cause side effects and always return the same output for the same input.
- **Separation of Concerns**: Decompose logic into validation, data resolution, and side-effect execution modules.
- **Declarative Data Flow**: Use function composition and higher-order functions to build complex logic from small, reusable parts.
- **Immutability**: Avoid mutating input data. Return new objects or values instead of modifying existing ones.
- **Explicit Error Handling**: Avoid exceptions for control flow. Use explicit types to represent success/failure and presence/absence of values.

## TypeScript Patterns

- **Result Type**: Use the `Result` type from the [NeverThrow](https://github.com/supermacro/neverthrow) library for all operations that can fail. This enforces explicit error handling and makes error propagation predictable.
- **Option Type**: Use the custom `Option` type from the [`@stamp-lib/stamp-option`](https://github.com/your-org/stamp-option) library to represent values that may or may not be present, instead of `null` or `undefined`.
- **Type Safety**: Leverage TypeScript's type system to ensure correctness and prevent runtime errors.
- **Coding Style**: Follow the [TypeScript Deep Dive Styleguide](https://github.com/basarat/typescript-book/blob/master/docs/styleguide/styleguide.md) for naming, structure, and idioms.

## Testing Guidelines

- **Unit Tests for Pure Functions**: Write comprehensive unit tests for all pure functions (validation, transformation, etc.).
- **Component Isolation**: Test each module (validation, resolution, execution) in isolation with focused, deterministic tests.
- **Integration Tests for Composition**: Write integration tests for composed workflows to ensure end-to-end correctness.
- **Mocking**: Use mocks for all side-effectful dependencies (DB, network, etc.) in unit and integration tests.
- **Test Coverage**: Strive for high coverage, especially for business logic and error handling paths.
- **Test Naming**: Use descriptive test names that clearly state the expected behavior.

## Example Patterns

- **Result/Option Usage**:
  ```typescript
  import { ok, err, Result } from 'neverthrow';
  import { some, none, Option } from '@stamp-lib/stamp-option';

  function parseInput(input: string): Result<number, Error> {
    const n = Number(input);
    return isNaN(n) ? err(new Error('Invalid number')) : ok(n);
  }

  function findUser(id: string): Option<User> {
    // ...
    return user ? some(user) : none;
  }
  ```
- **Pure Function Example**:
  ```typescript
  function add(a: number, b: number): number {
    return a + b;
  }
  ```
- **Test Example**:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { add } from './math';

  describe('add', () => {
    it('adds two numbers', () => {
      expect(add(2, 3)).toBe(5);
    });
  });
  ```

## Summary

- Write modular, functional, and type-safe TypeScript code.
- Use `Result` and `Option` types for explicit, declarative error and value handling.
- Organize code by concern (validation, resolution, execution) and test each in isolation.
- Follow the Basarat TypeScript Styleguide for consistency.
- Prioritize testability, maintainability, and clarity in all code and tests.

## Web-UI Development Guidelines

### Project Structure

The web-ui application is located in `apps/web-ui/` and uses Next.js with TypeScript. Key directories:

- `src/app/` - Next.js App Router pages and components
- `src/components/` - Reusable React components
- `src/server-actions/` - Server-side actions
- `tests/` - Test files and test setup utilities

### Development Setup

1. **Installation**: Navigate to `apps/web-ui/` and run `npm ci` to install dependencies
2. **Environment**: Create a `.env` file under `apps/web-ui/tests/` with required environment variables:
   ```
   NEXTAUTH_SECRET=<Please specify the next auth secret>
   ```

### Testing with Playwright

#### Test File Conventions

- Place test files alongside the pages they test, using `.test.ts` extension
- Example: `src/app/catalog/[catalogId]/resource-type/[resourceTypeId]/page.test.ts`

**From Command Line:**
```bash
cd apps/web-ui/

# Run specific test file
npx playwright test --forbid-only src/app/user/page.test.ts --workers=1

# Run tests with specific timeout and browser
npx playwright test --timeout=60000 --project=chromium "src/app/catalog/\\[catalogId\\]/resource-type/\\[resourceTypeId\\]/page.test.ts" --workers=1

# Run all tests
npx playwright test --workers=1
```

#### Comprehensive Testing (Production Mode)

For comprehensive testing that mirrors production behavior, build the application and run tests in production mode:

```bash
cd apps/web-ui/

# Build the application for production
npm run next-build

# Set NODE_ENV to production and run all tests
NODE_ENV=production npx playwright test --reporter=line --forbid-only --workers=1
```

#### Test Structure Best Practices

- Use `test.describe.configure({ mode: "serial", timeout: 1000000 })` for serial execution
- Create comprehensive mock data for different scenarios (with/without updateApprover, pending updates, etc.)
- Use `runTestWithMockServers()` for consistent test environment setup
- Prefer `getByRole()` over `getByText()` when multiple elements might match

#### Mock Setup

- Use `createMockStampHubRouter()` to create mock routers
- Create separate mock configurations for different test scenarios
- Mock both system and user request routers appropriately

#### Example Test Structure

```typescript
import { test, expect } from "@playwright/test";
import { runTestWithMockServers } from "../../../../../../tests/mocks/testEnvironmentSetup";
import { createMockStampHubRouter } from "../../../../../../tests/mocks/router/stampHubRouter";

test.describe.configure({ mode: "serial", timeout: 1000000 });

test.describe("Page Name", () => {
  test("should handle specific functionality", async ({ page, context }) => {
    const mockRouter = createMockStampHubRouter({
      // Mock configuration
    });

    await runTestWithMockServers(context, mockRouter, async () => {
      // Test implementation
    });
  });
});
```
