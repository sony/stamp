// Moves apps/web-ui to the @stamp-lib/* packages of the current release. Needs the full git history.
//
//   node scripts/release/bump-web-ui.mjs verify
//     Read-only job: installs the packages, verifies registry signatures and provenance
//     (`npm audit signatures`) and type-checks web-ui against them. Runs package code.
//   node scripts/release/bump-web-ui.mjs update <dir>
//     Write-enabled job: regenerates package.json and package-lock.json itself with
//     `npm install --package-lock-only` (fetches package metadata only, runs no package code)
//     and requires them to be byte-identical to the ones the read-only job tested (<dir>).
//     The read-only job's files are only compared, never used.
import { $, argv, fs, path } from "zx";
import { REPO_ROOT, fail, isStamp, lernaVersion, readJson, verifyPublished, verifyWebUi } from "./lib.mjs";

const WEB_UI = path.join(REPO_ROOT, "apps/web-ui");
const MANIFESTS = ["package.json", "package-lock.json"];
const [mode, testedDir] = argv._;
if (!(mode === "verify" || (mode === "update" && testedDir))) fail("Usage: bump-web-ui.mjs verify | update <dir>");

await verifyPublished();

const version = await lernaVersion();
const { dependencies } = await readJson("apps/web-ui/package.json");
const specs = Object.keys(dependencies)
  .filter(isStamp)
  .map((name) => `${name}@${version}`);
// @stamp-lib/* is exempt from min-release-age via apps/web-ui/.npmrc; everything else keeps the 7-day window.
const npm = $({ cwd: WEB_UI, stdio: "inherit" });

if (mode === "verify") {
  await npm`npm install --save-exact ${specs}`;
  await npm`npm audit signatures`;
  await verifyWebUi();
  await npm`npx --no-install tsc --noEmit`;
} else {
  await npm`npm install --package-lock-only --save-exact ${specs}`;
  await verifyWebUi();
  for (const file of MANIFESTS) {
    const [ours, tested] = await Promise.all([fs.readFile(path.join(WEB_UI, file)), fs.readFile(path.join(testedDir, file))]);
    if (!ours.equals(tested)) fail(`apps/web-ui/${file} differs from the one the read-only job installed and tested.`);
  }
  console.log(`apps/web-ui/${MANIFESTS.join(" and ")} match the tested ones.`);
}
