// Configures npm trusted publishing for every publishable @stamp-lib package:
//   GitHub Actions, sony/stamp, .github/workflows/npm-stage-publish.yml, `npm stage publish` only.
//
// Run locally as an npm maintainer of the packages with 2FA enabled (npm 12, as the repository's
// devEngines require). The first package asks for 2FA; choose "skip two-factor authentication
// for the next 5 minutes" on the npm website so the rest go through.
//
// A new trusted publisher configuration expires if it is not used for a successful publish
// within 2 days, so run the "npm stage publish" workflow right after this.
//
// Usage: npm ci --prefix scripts/release && node scripts/release/setup-npm-trust.mjs [--dry-run]
import { $, argv, sleep } from "zx";
import { fail, publishablePackages, REPOSITORY, STAGE_WORKFLOW_PATH } from "./lib.mjs";

const dryRun = argv["dry-run"] ? ["--dry-run"] : [];
const workflowFile = STAGE_WORKFLOW_PATH.split("/").at(-1);
// stdio "inherit" gives npm the terminal, which it needs to prompt for 2FA.
const npm = $({ nothrow: true, stdio: "inherit" });

const failed = [];
for (const { name } of await publishablePackages()) {
  console.log(`==> ${name}`);
  const result = await npm`npm trust github ${name} --repo ${REPOSITORY} --file ${workflowFile} --allow-stage-publish --yes ${dryRun}`;
  if (!result.ok) {
    failed.push(name);
    await npm`npm trust list ${name}`;
  }
  await sleep(2000); // avoid registry rate limiting, as recommended by `npm help trust`
}

if (failed.length) {
  fail(
    `Failed for: ${failed.join(", ")}`,
    "A package can have only one trusted publisher; remove an old one with `npm trust revoke <package> --id <id>` and re-run.",
  );
}
