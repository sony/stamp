// Read-only half of the bump-web-ui step: checks the published packages, moves apps/web-ui to
// them, and verifies the result. apply-changes.mjs takes the two manifests from here in the job
// that opens the PR.
//
// Usage: node scripts/release/bump-web-ui.mjs   (needs the full git history)
import { $, path } from "zx";
import { REPO_ROOT, isStamp, lernaVersion, readJson, verifyPublished, verifyWebUi } from "./lib.mjs";

await verifyPublished();

const version = await lernaVersion();
const { dependencies } = await readJson("apps/web-ui/package.json");
const specs = Object.keys(dependencies)
  .filter(isStamp)
  .map((name) => `${name}@${version}`);

const webUi = $({ cwd: path.join(REPO_ROOT, "apps/web-ui"), stdio: "inherit" });
// @stamp-lib/* is exempt from min-release-age via apps/web-ui/.npmrc; everything else keeps the 7-day window.
await webUi`npm install --save-exact ${specs}`;
// Registry signatures and provenance attestations of the installed tree.
await webUi`npm audit signatures`;
await verifyWebUi();
await webUi`npx --no-install tsc --noEmit`;
