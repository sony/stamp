// Stage-job half of npm-stage-publish.yml (runs WITH id-token permission).
// Stages the tarballs built by pack.mjs. No package code runs in this job. The artifact download
// already verifies the tarballs' digest; everything else is checked here against this job's own
// checkout instead of trusting the build job (which runs package code):
//   - the version, dist-tag and set of tarballs,
//   - each tarball's package.json, which must be byte-identical to the checked-out one.
// The job summary lists the stage ID of every package staged by this run; only those may be approved.
//
// Usage: node scripts/release/stage.mjs <tarball-dir>
import { $, argv, fs, path } from "zx";
import { REPO_ROOT, fail, publishablePackages, summary, tarballName, verifyRelease } from "./lib.mjs";

const dir = path.resolve(argv._[0] ?? fail("Usage: stage.mjs <tarball-dir>"));
const { version, distTag } = await verifyRelease();
const packages = new Map((await publishablePackages()).map((p) => [p.name, p]));
const manifest = await fs.readJson(path.join(dir, "manifest.json"));

// The build job only decides the order.
const sorted = (list) => JSON.stringify([...list].sort());
const ordered = manifest.packages.map((p) => p.name);
if (
  manifest.version !== version ||
  manifest.distTag !== distTag ||
  sorted(ordered) !== sorted(packages.keys()) ||
  sorted(await fs.readdir(dir)) !== sorted([...ordered.map((name) => tarballName(name, version)), "manifest.json"])
) {
  fail("The build job's tarballs do not match the packages and version in this commit.");
}

// The manifest inside each tarball decides scripts, dependencies, bin and publishConfig.
const tarball = (name) => path.join(dir, tarballName(name, version));
const tampered = [];
for (const name of ordered) {
  const packed = (await $`tar -xzOf ${tarball(name)} package/package.json`).stdout;
  const source = await fs.readFile(path.join(REPO_ROOT, packages.get(name).dir, "package.json"), "utf8");
  if (packed !== source) tampered.push(name);
}
if (tampered.length) fail(`The package.json inside these tarballs differs from the checkout: ${tampered.join(", ")}`);

const staged = [];
const failed = [];
for (const name of ordered) {
  if ((await $({ nothrow: true, quiet: true })`npm view ${`${name}@${version}`} version`).ok) continue;
  const result = await $({ nothrow: true })`npm stage publish ${tarball(name)} --tag ${distTag} --provenance --json`;
  process.stderr.write(result.stderr);
  const stageId = result.ok ? JSON.parse(result.stdout)[name]?.stageId : undefined;
  if (stageId) staged.push({ name, stageId });
  else failed.push(name);
}

if (staged.length) {
  await summary(
    `## Staged @stamp-lib packages ${version} (dist-tag: ${distTag})`,
    "",
    "Approve **exactly these stage IDs**, in this order (dependencies first), on npmjs.com (package page → Staged Packages) or with `npm stage approve <stage-id>`.",
    "Do not approve any other staged version of these packages: anything not listed here was not staged by this run.",
    "",
    "| Package | Stage ID |",
    "| --- | --- |",
    ...staged.map(({ name, stageId }) => `| \`${name}\` | \`${stageId}\` |`),
    "",
    "After approving all of them, run the **release** workflow with `bump-web-ui`.",
  );
}

if (failed.length) {
  await summary("", `**Not staged:** ${failed.map((name) => `\`${name}\``).join(", ")}`);
  fail(
    `Not staged: ${failed.join(", ")}. A version can be staged only once. If an earlier run you started staged it, its stage ID ` +
      "is in that run's summary and may be approved. Otherwise do NOT approve it: reject it (npm stage list <package>, then " +
      "npm stage reject <stage-id>) and re-run this workflow.",
  );
}
if (staged.length === 0) {
  fail(`Every package is already published at ${version}. Was the version bump PR merged before running this workflow?`);
}
