// Stage-job half of npm-stage-publish.yml (runs WITH id-token permission).
// Stages the tarballs built by pack.mjs. No package code runs in this job. The artifact
// download already verifies the tarballs' digest; the version, dist-tag and expected set of
// tarballs are recomputed here from the checkout instead of trusting the build job.
//
// Usage: node scripts/release/stage.mjs <tarball-dir>
import { $, argv, fs, path } from "zx";
import { fail, publishablePackages, summary, tarballName, verifyRelease } from "./lib.mjs";

const dir = path.resolve(argv._[0] ?? fail("Usage: stage.mjs <tarball-dir>"));
const { version, distTag } = await verifyRelease();
const manifest = await fs.readJson(path.join(dir, "manifest.json"));

// The build job only decides the order; everything else must match this commit.
const sorted = (list) => JSON.stringify([...list].sort());
const expected = (await publishablePackages()).map((p) => p.name);
const ordered = manifest.packages.map((p) => p.name);
if (
  manifest.version !== version ||
  manifest.distTag !== distTag ||
  sorted(ordered) !== sorted(expected) ||
  sorted(await fs.readdir(dir)) !== sorted([...expected.map((name) => tarballName(name, version)), "manifest.json"])
) {
  fail("The build job's tarballs do not match the packages and version in this commit.");
}

await summary(
  `## Staged @stamp-lib packages ${version} (dist-tag: ${distTag})`,
  "",
  "Approve them on npmjs.com (package page → Staged Packages) or with `npm stage approve`, in this order:",
  "",
);

const staged = [];
const failed = [];
for (const name of ordered) {
  if ((await $({ nothrow: true, quiet: true })`npm view ${`${name}@${version}`} version`).ok) {
    await summary(`1. \`${name}\` (already published)`);
    continue;
  }
  const tarball = path.join(dir, tarballName(name, version));
  if ((await $({ nothrow: true, stdio: "inherit" })`npm stage publish ${tarball} --tag ${distTag} --provenance`).ok) {
    staged.push(name);
    await summary(`1. \`${name}\``);
  } else {
    failed.push(name);
    await summary(`1. \`${name}\` **not staged** (it may already be staged from an earlier run: \`npm stage list ${name}\`)`);
  }
}

await summary("", "After approving all of them, run the **release** workflow with `bump-web-ui`.");

if (failed.length) {
  fail(
    `Not staged: ${failed.join(", ")}. If a version is already staged (pending approval) from an earlier run, ` +
      "approve it, or reject it (npm stage reject) and re-run to rebuild it.",
  );
}
if (staged.length === 0) {
  fail(`Every package is already published at ${version}. Was the version bump PR merged before running this workflow?`);
}
