// Read-only half of the bump-version step: runs `lerna version` and writes the result as a
// patch for apply-changes.mjs in the job that opens the PR.
//
// Usage: node scripts/release/bump-version.mjs <patch|minor|major|rc|patch-rc|minor-rc|major-rc> <patch-file>
import { $, argv, fs } from "zx";
import { fail, verifyRelease } from "./lib.mjs";

const BUMPS = ["patch", "minor", "major", "rc", "patch-rc", "minor-rc", "major-rc"];
const [bump, patchFile] = argv._;
if (!BUMPS.includes(bump) || !patchFile) fail(`Usage: bump-version.mjs <${BUMPS.join("|")}> <patch-file>`);

// The versionup:* scripts run lerna version with the settings in lerna.json (no commit, tag or push).
await $({ stdio: "inherit" })`npm run ${`versionup:${bump}`} -- --yes`;
const { version } = await verifyRelease();
await fs.writeFile(patchFile, (await $`git diff --binary`).stdout);
console.log(`Bumped to ${version}`);
