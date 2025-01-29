# Unit Testing with Playwright

## Preparation

### Installing Required Packages

Run the following command to install the required packages.

```
$ cd apps/web-ui/
$ npm ci
```

### Visual Studio Code Extension Installation

If you are running tests from Visual Studio Code, install the Playwright extension. Follow the instructions in the [official Playwright documentation](https://playwright.dev/docs/getting-started-vscode).

### .env File Preparation

Create a `.env` file under `apps/web-ui/tests/` with the following environment:

```
NEXTAUTH_SECRET=<Please specify the next auth secret>
```

## Test run

### Running Tests from Visual Studio Code

1. Click on the flask-shaped icon on the left side of the Visual Studio Code screen to switch the view to `TEST EXPLORER`.
2. Enable the `Show trace viewer` option in the PLAYWRIGHT checkbox to view UI transitions in the browser.
3. In `TEST EXPLORER`, navigate to `apps > web-ui > tests > test-user.spec.ts`, and click on the play icon next to `test-user.spec.ts` to start the test.
   - The logs during execution are displayed in the `TEST RESULTS` window.

### Running Tests from the Command Line

To execute the tests from the command line, run the following command:

```bash
$ cd apps/web-ui/
$ npx playwright test --forbid-only src/app/user/page.test.ts
```

Note: This command runs tests on three browsers. For more command line options of Playwright, refer to the [official Playwright CLI documentation](https://playwright.dev/docs/test-cli#reference)
